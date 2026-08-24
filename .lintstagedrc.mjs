const oxlintSkipped = (file) => {
  const rel = file.replaceAll('\\', '/')
  return (
    rel.includes('/.storybook/') ||
    rel.includes('/scripts/') ||
    rel.includes('/tools/oxlint/anti-slop/') ||
    /\.config\.(js|cjs|mjs|ts)$/.test(rel)
  )
}

const quoted = (files) => files.map((file) => JSON.stringify(file)).join(' ')

export default {
  '*.{js,jsx,ts,tsx}': (files) => {
    const lintable = files.filter((file) => !oxlintSkipped(file))
    return [
      ...(lintable.length > 0 ? [`oxlint --fix ${quoted(lintable)}`] : []),
      `prettier --write ${quoted(files)}`,
    ]
  },
  '*.{json,md}': 'prettier --write',
}
