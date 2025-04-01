import { useState } from "react";
import { ComponentMeta, ComponentStory, Story } from "@storybook/react";
import defaults from "../../settings/defaults";
import { CSVImporterProps } from "../../types";
import ImporterComponent from "./index";

export default {
  title: "User Interface/Importer",
  component: ImporterComponent,
  argTypes: {
    primaryColor: {
      control: { type: "color" },
    },
    labelColor: {
      control: { type: "color" },
    },
  },
} as ComponentMeta<typeof ImporterComponent>;

const template = {
  columns: [
    {
      name: "First Name",
      key: "first_name",
      required: true,
      description: "The first name of the user",
      suggested_mappings: ["first", "mame"],
    },
    {
      name: "Last Name",
      suggested_mappings: ["last"],
    },
    {
      name: "Email",
      required: true,
      description: "The email of the user",
    },
  ],
};

const Template: Story<typeof ImporterComponent> = (args: CSVImporterProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const { isModal } = args;

  const props = {
    ...(isModal ? { modalIsOpen: isOpen } : {}),
    ...(isModal ? { modalOnCloseTriggered: () => setIsOpen(false) } : {}),
    ...(isModal ? { modalCloseOnOutsideClick: args.modalCloseOnOutsideClick } : {}),
    ...args,
  };

  return (
    <div>
      {args.isModal && <button onClick={() => setIsOpen(true)}>Import</button>}
      <ImporterComponent key={props.isModal?.toString()} {...props} />
    </div>
  );
};

export const Importer = Template.bind({});
Importer.args = {
  language: "en",
  ...defaults,
  template: template,
  customTranslations: {
    jp: {
      Upload: "アップロード",
      "Browse files": "ファイルを参照",
    },
    pt: {
      Upload: "Carregar",
      "Browse files": "Procurar arquivos",
    },
  },
};

export const WithCustomStep = Template.bind({});
WithCustomStep.args = {
  ...Importer.args,
  customStep: {
    name: "Review & Confirm",
    component: (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h3>Review Your Import</h3>
        <div style={{ margin: "20px 0" }}>
          <p>Please review the following information before completing the import:</p>
          <ul style={{ textAlign: "left", maxWidth: "400px", margin: "0 auto" }}>
            <li>Total records to import: 150</li>
            <li>Required fields present: Yes</li>
            <li>Data format valid: Yes</li>
          </ul>
        </div>
        <div style={{ 
          backgroundColor: "#f5f5f5", 
          padding: "15px", 
          borderRadius: "8px",
          marginTop: "20px"
        }}>
          <p style={{ margin: "0", color: "#666" }}>
            Click "Complete" to proceed with the import
          </p>
        </div>
      </div>
    ),
  },
};
