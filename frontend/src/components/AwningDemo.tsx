import React, { useState } from "react"
import { Awning } from "./ui/awning"

const AwningDemo: React.FC = () => {
  const [controlledOpen, setControlledOpen] = useState(false)

  return (
    <div className="p-8 space-y-12 bg-offWhite min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-offBlack mb-2">Shop Front Awning Demo</h1>
        <p className="text-offBlack/70">Toggle the awnings to see them in action!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Default Awning */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-offBlack">Default Blue Awning</h2>
          <Awning>
            <div className="text-offWhite font-medium">
              Welcome to<br />Our Shop!
            </div>
          </Awning>
        </div>

        {/* Green Awning */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-offBlack">Green Awning</h2>
          <Awning variant="green" size="lg">
            <div className="text-offWhite font-medium">
              Fresh Produce<br />Daily!
            </div>
          </Awning>
        </div>

        {/* Classic Striped Awning */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-offBlack">Classic Red Awning</h2>
          <Awning variant="classic" size="xl">
            <div className="text-offBlack font-medium">
              Vintage Style<br />Since 1950
            </div>
          </Awning>
        </div>

        {/* Controlled Awning */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-offBlack">Controlled Awning</h2>
          <Awning 
            variant="gold" 
            isOpen={controlledOpen}
            onToggle={() => setControlledOpen(!controlledOpen)}
          >
            <div className="text-offBlack font-medium">
              Bakery & Café<br />Open 7am-6pm
            </div>
          </Awning>
          <div className="text-center">
            <button 
              onClick={() => setControlledOpen(!controlledOpen)}
              className="bg-blue text-offWhite px-4 py-2 rounded-lg hover:bg-blue/90 transition-colors"
            >
              External Control: {controlledOpen ? "Close" : "Open"}
            </button>
          </div>
        </div>

        {/* Purple Awning - Small */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-offBlack">Small Purple Awning</h2>
          <Awning variant="purple" size="sm">
            <div className="text-offWhite font-medium text-sm">
              Boutique
            </div>
          </Awning>
        </div>

        {/* Striped Awning */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-offBlack">Striped Awning</h2>
          <Awning variant="striped">
            <div className="text-offBlack font-medium">
              Ice Cream<br />& Treats
            </div>
          </Awning>
        </div>
      </div>

      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold text-offBlack">Usage Examples</h2>
        <div className="bg-offWhite border border-offBlack16 rounded-lg p-4 text-left">
          <pre className="text-sm text-offBlack font-mono">
{`// Basic usage
<Awning>
  <div>Your content here</div>
</Awning>

// With variants and sizes
<Awning variant="green" size="lg">
  <div>Fresh Produce Daily!</div>
</Awning>

// Controlled state
<Awning 
  variant="gold" 
  isOpen={isOpen}
  onToggle={() => setIsOpen(!isOpen)}
>
  <div>Controlled awning</div>
</Awning>

// Without toggle controls
<Awning showToggle={false} isOpen={true}>
  <div>Always open</div>
</Awning>`}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default AwningDemo 