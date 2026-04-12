const mermaid = require('mermaid');
mermaid
  .render(
    'test',
    `graph TD
    A[Developer imports Button] --> B{Select Variant Prop}
    B -->|variant="default"| C[Solid Black / White Text]
`,
  )
  .then(console.log)
  .catch(console.error);
