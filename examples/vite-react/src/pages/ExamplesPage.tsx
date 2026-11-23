import { exampleLinks, formatHash } from '@/routes';

export function ExamplesPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 p-6 md:p-12">
      <h1 className="text-2xl font-semibold">Examples</h1>
      <ul className="overflow-hidden rounded-lg border bg-card">
        {exampleLinks.map((example) => (
          <li key={example.id} className="border-b last:border-b-0">
            <a
              href={formatHash({ destination: 'examples', exampleId: example.id })}
              className="flex w-full ps-4 pe-4 py-3 text-sm hover:bg-accent"
            >
              {example.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
