import { useState } from 'react'
import { useTournamentStore } from './store/tournament'
import Header from './components/Header'
import Setup from './screens/Setup'
import Judge from './screens/Judge'
import TV from './screens/TV'

type Screen = 'setup' | 'judge' | 'tv'

export default function MainApp() {
  const [screen, setScreen] = useState<Screen>('setup')
  const theme = useTournamentStore(s => s.t.theme)
  const setTheme = useTournamentStore(s => s.setTheme)

  return (
    <div
      data-theme={theme}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        color: 'var(--ink)',
        // TV needs a locked viewport so its scale transform fits without scrollbars.
        // Setup and Judge must scroll freely.
        ...(screen === 'tv'
          ? { height: '100vh', overflow: 'hidden' }
          : { minHeight: '100vh' }),
      }}
    >
      <Header
        screen={screen}
        onNav={setScreen}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dotonbori' ? 'seasons' : 'dotonbori')}
      />
      {screen === 'setup' && <Setup />}
      {screen === 'judge' && <Judge />}
      {screen === 'tv' && <TV />}
    </div>
  )
}
