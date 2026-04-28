export const radius = {
  chip: 999,
  input: 8,
  button: 10,
  card: 16,
  sheet: 28,
  modal: 24,
} as const;

export type Radius = typeof radius;
