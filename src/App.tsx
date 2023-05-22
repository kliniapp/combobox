import './App.css'
import React from 'react'
import * as Combobox from './Combobox'

function App() {
  const [value, setValue] = React.useState('Value 3')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 50 }}>
      <Combobox.Root className="Combobox" value={value} onValueChange={setValue}>
        <Combobox.Anchor>
          <Combobox.Input className="ComboboxInput" />
          <Combobox.Open>▼</Combobox.Open>
        </Combobox.Anchor>
        <Combobox.Portal>
          <Combobox.Content className="ComboboxContent" sideOffset={8}>
            <Combobox.Item className="ComboboxItem" id="1">
              Value 1
            </Combobox.Item>
            <Combobox.Item className="ComboboxItem" id="2">
              Value 2
            </Combobox.Item>
            <Combobox.Item className="ComboboxItem" id="3">
              Value 3
            </Combobox.Item>
            <ComboboxItemAdd />
          </Combobox.Content>
        </Combobox.Portal>
      </Combobox.Root>
      <button>Seila</button>
    </div>
  )
}

const ComboboxItemAdd = () => {
  const render = Combobox.useCommandState((state) => state.filtered.count === 0)
  const search = Combobox.useCommandState((state) => state.search)
  return render ? (
    <Combobox.Item forceMount className="ComboboxItem">
      Add {search}
    </Combobox.Item>
  ) : null
}

export default App
