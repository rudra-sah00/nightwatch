import re
with open('src/features/search/components/content-detail-modal.tsx', 'r') as f:
    text = f.read()

text = re.sub(
    r"extraActions=\{\s*show\.id\.startsWith\('s2:'\)\s*\?\s*\(\s*<DownloadMenu\s*show=\{show\}\s*selectedSeason=\{selectedSeason\}\s*episodes=\{episodes\}\s*/>\s*\)\s*:\s*null\s*\}",
    r'''extraActions={
                  <DownloadMenu
                    show={show}
                    selectedSeason={selectedSeason}
                    episodes={episodes}
                  />
                }''',
    text
)

with open('src/features/search/components/content-detail-modal.tsx', 'w') as f:
    f.write(text)
