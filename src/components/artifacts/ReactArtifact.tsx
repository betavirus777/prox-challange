"use client";

import {
  SandpackProvider,
  SandpackPreview,
} from "@codesandbox/sandpack-react";

interface ReactArtifactProps {
  code: string;
}

export function ReactArtifact({ code }: ReactArtifactProps) {
  const appCode = code.includes("export default")
    ? code
    : `${code}\nexport default function App() { return <div>Component render error</div>; }`;

  return (
    <SandpackProvider
      template="react"
      theme="dark"
      files={{
        "/App.js": appCode,
      }}
      customSetup={{
        dependencies: {
          recharts: "2.15.0",
          "lucide-react": "0.475.0",
        },
      }}
      options={{
        externalResources: [
          "https://cdn.tailwindcss.com",
        ],
      }}
    >
      <div className="h-[500px] overflow-hidden rounded-lg border border-border">
        <SandpackPreview
          showOpenInCodeSandbox={false}
          showRefreshButton
        />
      </div>
    </SandpackProvider>
  );
}
