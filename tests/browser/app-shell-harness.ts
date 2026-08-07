const DEFAULT_APP_SHELL_TEST_PORT = 4174;
const MINIMUM_UNPRIVILEGED_PORT = 1024;
const MAXIMUM_PORT = 65_535;

function isValidTestPort(port: number): boolean {
  return Number.isInteger(port) && port >= MINIMUM_UNPRIVILEGED_PORT && port <= MAXIMUM_PORT;
}

export function resolveAppShellTestPort(): number {
  const override = process.env.APPSHELL_TEST_PORT;
  if (override === undefined) return DEFAULT_APP_SHELL_TEST_PORT;

  const port = Number(override);
  if (!isValidTestPort(port)) {
    throw new Error(
      `APPSHELL_TEST_PORT must be an integer from ${MINIMUM_UNPRIVILEGED_PORT} to ${MAXIMUM_PORT}.`,
    );
  }

  return port;
}
