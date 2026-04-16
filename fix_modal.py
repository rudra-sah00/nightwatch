import re
with open('src/features/search/components/content-detail-modal.tsx', 'r') as f:
    text = f.read()

old_str = """                extraActions={
                  show.id.startsWith('s2:') ? (
                    <DownloadMenu
                      show={show}
                      selectedSeason={selectedSeason}
                      episodes={episodes}
                    />
                  ) : null
                }"""

new_str = """                extraActions={
                  <DownloadMenu
                    show={show}
                    selectedSeason={selectedSeason}
                    episodes={episodes}
                  />
                }"""

text = text.replace(old_str, new_str)
with open('src/features/search/components/content-detail-modal.tsx', 'w') as f:
    f.write(text)
