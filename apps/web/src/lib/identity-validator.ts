export function identityValidator<T>() {
  return (input: unknown) => input as T;
}
