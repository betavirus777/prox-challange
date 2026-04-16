import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
  console.error("Missing ELEVENLABS_API_KEY in .env");
  process.exit(1);
}

async function createAgent() {
  try {
    console.log("Creating ElevenLabs Voice Agent...");

    const response = await fetch(
      "https://api.elevenlabs.io/v1/convai/agents/create",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY as string,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Vulcan AI Assistant",
          conversation_config: {
            agent: {
              prompt: {
                prompt:
                  "You are the Vulcan OmniPro 220 AI support assistant. You provide brief, helpful, and technically accurate responses about welding setups, troubleshooting, and specifications based on the user's queries. ALWAYS be concise and keep responses under 2 sentences.",
              },
              first_message:
                "Hi, I'm your Vulcan AI Assistant. How can I help you with your welder today?",
              language: "en",
            },
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`API Error: ${await response.text()}`);
    }

    const data = await response.json();
    const agentId = data.agent_id;

    console.log("Agent created successfully!");
    console.log("Agent ID:", agentId);

    // Update .env file
    const envPath = path.join(process.cwd(), ".env");
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    }

    // Replace or add
    if (envContent.includes("NEXT_PUBLIC_ELEVENLABS_AGENT_ID=")) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_ELEVENLABS_AGENT_ID=.*/,
        `NEXT_PUBLIC_ELEVENLABS_AGENT_ID=${agentId}`,
      );
    } else {
      envContent += `\nNEXT_PUBLIC_ELEVENLABS_AGENT_ID=${agentId}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log(
      "Successfully updated .env with NEXT_PUBLIC_ELEVENLABS_AGENT_ID",
    );
  } catch (error) {
    console.error("Failed to create agent:", error);
  }
}

createAgent();
