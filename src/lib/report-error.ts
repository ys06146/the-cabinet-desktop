export function reportApplicationError(error: unknown): void {
  const normalizedError = error instanceof Error ? error : new Error(String(error));
  window.theCabinet?.reportRendererError({
    message: normalizedError.message,
    stack: normalizedError.stack,
  });
}
