import type { Meta, StoryObj } from "@storybook/react-vite";
import { BibleSDKProvider } from "@youversion/platform-react-hooks";

import { BibleWidgetView } from "./bible-widget-view";

const meta = {
  title: "Components/BibleWidgetView",
  component: BibleWidgetView,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story: React.ComponentType): React.ReactElement => (
      <BibleSDKProvider
        appId={import.meta.env.STORYBOOK_YOUVERSION_APP_ID || ""}
      >
        <Story />
      </BibleSDKProvider>
    ),
  ],
  tags: ["autodocs"],
  argTypes: {
    reference: {
      control: "text",
      description: 'USFM reference (e.g., "JHN.3.16", "JHN.3.16-17", "JHN.3")',
    },
    versionId: {
      control: "number",
      description: "Bible version ID (e.g., 206 for NLT)",
    },
  },
} satisfies Meta<typeof BibleWidgetView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    reference: "LUK.1.39-45",
    versionId: 111,
  },
};
export const DarkMode: Story = {
  args: {
    reference: "LUK.1.39-45",
    versionId: 111,
    background: "dark",
  },
};
