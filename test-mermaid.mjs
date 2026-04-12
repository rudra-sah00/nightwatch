import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false });

(async () => {
  try {
    const { svg } = await mermaid.render(
      'test-123',
      `graph TD
    A[Developer imports Button] --> B{Select Variant Prop}
    B -->|variant="default"| C[Solid Black / White Text]
    B -->|variant="neo-yellow"| D[Solid Yellow / Black Text]
    B -->|variant="neo-red"| E[Warning Red / White Text]
    B -->|variant="neo-outline"| F[Transparent / Black Border / Inverts on Hover]
    B -->|variant="neo-ghost"| G[Transparent / Faint Hover]
    
    C --> H[Standardized Tailwind Output]
    D --> H
    E --> H
    F --> H
    G --> H
    
    H --> I[Consistent Neo-Brutalist Component]`,
    );
    console.log('SUCCESS');
  } catch (err) {
    console.error('ERROR', err);
  }
})();
