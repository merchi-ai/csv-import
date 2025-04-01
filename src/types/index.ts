import { Resource } from "i18next";
import { HTMLAttributes, ReactNode } from "react";

type ModalParams = {
  isModal?: boolean;
  modalIsOpen?: boolean;
  modalOnCloseTriggered?: () => void;
  modalCloseOnOutsideClick?: boolean;
};

type CustomProps = {
  template?: Record<string, unknown> | string;
  darkMode?: boolean;
  primaryColor?: string;
  className?: string;
  onComplete?: (data: any) => void;
  waitOnComplete?: boolean;
  customStyles?: Record<string, string> | string;
  showDownloadTemplateButton?: boolean;
  skipHeaderRowSelection?: boolean;
  language?: string;
  customTranslations?: Resource;
  customStep?: {
    component: ReactNode;
    name: string;
  };
};

export type CSVImporterProps = CustomProps & ModalParams & HTMLAttributes<HTMLDialogElement>;
