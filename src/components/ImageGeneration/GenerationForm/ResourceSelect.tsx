import {
  Input,
  InputWrapperProps,
  Button,
  Card,
  Stack,
  Text,
  Group,
  ActionIcon,
  Slider,
  Modal,
  TextInput,
  Badge,
  Loader,
  createStyles,
  CloseButton,
  Divider,
  Box,
  ThemeIcon,
  HoverCard,
} from '@mantine/core';
import { useDebouncedValue, useDidUpdate } from '@mantine/hooks';
import { ModelType } from '@prisma/client';
import { IconAlertTriangle, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { TrainedWords } from '~/components/TrainedWords/TrainedWords';
import { withController } from '~/libs/form/hoc/withController';
import { BaseModel } from '~/server/common/constants';
import { Generation } from '~/server/services/generation/generation.types';
import { removeEmpty } from '~/utils/object-helpers';
import { getDisplayName } from '~/utils/string-helpers';
import { trpc } from '~/utils/trpc';

export function ResourceSelect({
  value,
  onChange,
  onRemove,
  types,
  label,
  ...inputWrapperProps
}: {
  value?: Generation.Resource | null;
  onChange?: (value: Generation.Resource | null) => void;
  onRemove?: () => void;
  types?: ModelType[];
} & Omit<InputWrapperProps, 'children' | 'onChange'>) {
  const [opened, setOpened] = useState(false);
  const [strength, setStrength] = useState(value?.strength ?? 1);
  // const [resource, setResource] = useState(value);

  useEffect(() => {
    if (!value) return;
    handleSetResource?.({ ...value, strength });
  }, [strength]); // eslint-disable-line

  const handleStrengthChange = (strength: number) => {
    const rounded = Math.round(strength * 100) / 100;
    setStrength(rounded);
  };

  const handleRemove = () => {
    handleSetResource?.(null);
    onRemove?.();
  };

  const handleSetResource = (resource: Generation.Resource | null) => {
    // setResource(resource);
    onChange?.(resource);
  };

  // const { formState } = useFormContext();
  // const { isSubmitted, isDirty } = formState;
  // useDidUpdate(() => {
  //   if (!isSubmitted && !isDirty) {
  //     // clear value when form is reset
  //     setResource(value);
  //   }
  // }, [isDirty]); //eslint-disable-line

  const hasTrainedWords = !!value?.trainedWords?.length;
  const hasStrength = value?.modelType === ModelType.LORA;
  const hasAdditionalContent = hasTrainedWords || hasStrength;
  const unavailable = value?.covered === false;

  let ResourceCard = value && (
    <Card p="xs" withBorder>
      <Card.Section withBorder={hasAdditionalContent} p="xs" py={6}>
        <Group spacing="xs">
          {unavailable && (
            <ThemeIcon color="red" w="auto" size="sm" px={4}>
              <Group spacing={4}>
                <IconAlertTriangle size={16} strokeWidth={3} />
                <Text size="xs" weight={500}>
                  Unavailable
                </Text>
              </Group>
            </ThemeIcon>
          )}
          <Text lineClamp={1} size="sm" weight={500}>
            {value.modelName} - {value.name}
          </Text>
          <ActionIcon
            size="sm"
            variant={unavailable ? 'filled' : 'subtle'}
            color="red"
            onClick={handleRemove}
            ml="auto"
          >
            <IconX size={20} />
          </ActionIcon>
        </Group>
      </Card.Section>
      {hasAdditionalContent && !unavailable && (
        <Stack spacing={6} pt="xs">
          {/* LORA */}
          {hasStrength && (
            <Group spacing="xs" align="center">
              <Text size="xs" weight={500}>
                Strength
              </Text>
              <Slider
                style={{ flex: 1 }}
                value={strength}
                onChange={handleStrengthChange}
                marks={[{ value: 0 }, { value: 1 }]}
                step={0.05}
                min={-1}
                max={2}
              />
              <Text size="xs" w={28} ta="right">{`${strength.toFixed(2)}`}</Text>
            </Group>
          )}
          {hasTrainedWords && (
            <TrainedWords trainedWords={value.trainedWords} type={value.modelType} limit={4} />
          )}
        </Stack>
      )}
    </Card>
  );

  if (unavailable && value)
    ResourceCard = (
      <HoverCard withArrow shadow="md">
        <HoverCard.Target>{ResourceCard}</HoverCard.Target>
        <HoverCard.Dropdown maw={300}>
          <Text weight={500}>This resource is unavailable</Text>
          <Text size="xs">
            {`The resource that you have selected is not available for generation at this
        time. We're always adding support for more, so check back soon!`}
          </Text>
        </HoverCard.Dropdown>
      </HoverCard>
    );

  return (
    <>
      <Input.Wrapper
        label={label ?? getDisplayName(value?.modelType ?? 'Resource')}
        {...inputWrapperProps}
      >
        {!value ? (
          <div>
            <Button
              mb={inputWrapperProps.error ? 5 : undefined}
              onClick={() => setOpened(true)}
              variant="outline"
              size="xs"
              fullWidth
            >
              Add {label}
            </Button>
          </div>
        ) : (
          ResourceCard
        )}
      </Input.Wrapper>
      {!value && (
        <ResourceSelectModal
          opened={opened}
          onClose={() => setOpened(false)}
          title={`Select ${label}`}
          onSelect={(value) => handleSetResource(value)}
          types={types}
        />
      )}
    </>
  );
}
export const InputResourceSelect = withController(ResourceSelect, ({ field }) => ({
  value: field.value ?? undefined,
}));

export function ResourceSelectModal({
  opened,
  onClose,
  title,
  onSelect,
  types,
  notIds = [],
  baseModel,
}: {
  opened: boolean;
  onClose: () => void;
  title?: string;
  onSelect: (value: Generation.Resource) => void;
  types?: ModelType[];
  notIds?: number[];
  baseModel?: string;
}) {
  const { classes } = useStyles();
  const [search, setSearch] = useState('');
  const [debounced] = useDebouncedValue(search, 300);

  const { data = [], isInitialLoading: isLoading } = trpc.generation.getResources.useQuery(
    {
      types,
      query: debounced,
      baseModel,
      supported: true,
    },
    {
      keepPreviousData: true,
    }
  );

  const handleSelect = (value: Generation.Resource) => {
    onSelect(value);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      withCloseButton={false}
      onClose={onClose}
      size="sm"
      padding={0}
      zIndex={400}
    >
      {opened && (
        <Stack spacing={4}>
          <Stack p="xs">
            <Group position="apart">
              {title ? <Text>{title}</Text> : <div></div>}
              <CloseButton onClick={onClose} />
            </Group>
            <TextInput
              value={search}
              placeholder="Search"
              onChange={(e) => setSearch(e.target.value)}
              rightSection={isLoading ? <Loader size="xs" /> : null}
              autoFocus
            />
          </Stack>
          {!debounced?.length && <Divider label="Popular Resources" labelPosition="center" />}
          <Stack spacing={0}>
            {data
              .filter((resource) => !notIds.includes(resource.id))
              .map((resource) => (
                <Stack
                  spacing={0}
                  key={`${resource.modelId}_${resource.id}`}
                  onClick={() => handleSelect(resource)}
                  className={classes.resource}
                  p="xs"
                >
                  <Group position="apart" noWrap>
                    <Text weight={500} lineClamp={1} size="sm">
                      {resource.modelName}
                    </Text>
                  </Group>
                  <Group position="apart">
                    <Text size="xs">{resource.name}</Text>
                    <Badge>{getDisplayName(resource.modelType)}</Badge>
                  </Group>
                </Stack>
              ))}
          </Stack>
        </Stack>
      )}
    </Modal>
  );
}

const useStyles = createStyles((theme) => {
  const colors = theme.fn.variant({ variant: 'light' });
  return {
    resource: {
      '&:hover': {
        cursor: 'pointer',
        background: colors.background,
      },
    },
  };
});
