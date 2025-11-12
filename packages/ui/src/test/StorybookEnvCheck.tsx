interface StorybookEnvCheckProps {
  children: React.ReactNode;
  requiredEnvVars?: string[];
}

function hasEnvVar(varName: string): boolean {
  // Access env vars safely with type assertion
  const env = import.meta.env as Record<string, string | undefined>;
  return !!env[varName];
}

export function StorybookEnvCheck({
  children,
  requiredEnvVars = [],
}: StorybookEnvCheckProps): React.ReactElement {
  const missingVars = requiredEnvVars.filter((varName) => !hasEnvVar(varName));

  if (missingVars.length > 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-4">
        <div className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 p-4">
          <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            Missing Environment Variables
          </h2>
          <p className="text-yellow-700 dark:text-yellow-300 mb-4">
            The following environment variables are required for this story to work properly:
          </p>
          <ul className="list-disc list-inside space-y-2 mb-4">
            {missingVars.map((varName) => (
              <li key={varName} className="text-yellow-800 dark:text-yellow-200">
                <code className="bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded">
                  {varName}
                </code>
              </li>
            ))}
          </ul>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Copy <code>.env.example</code> to <code>.env.local</code> in <code>packages/ui/</code>{' '}
            and fill in the required values.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
