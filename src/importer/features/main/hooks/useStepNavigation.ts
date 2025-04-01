import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import useStepper from "../../../components/Stepper/hooks/useStepper";
import { Steps } from "../types";
import useMutableLocalStorage from "./useMutableLocalStorage";
import { CSVImporterProps } from "../../../../types";

export const StepEnum = {
  Upload: 0,
  RowSelection: 1,
  MapColumns: 2,
  Custom: 3,
  Complete: 4,
};

const calculateNextStep = (nextStep: number, skipHeader: boolean, hasCustomStep: boolean) => {
  if (skipHeader) {
    switch (nextStep) {
      case StepEnum.Upload:
      case StepEnum.RowSelection:
        return StepEnum.MapColumns;
      case StepEnum.MapColumns:
        return hasCustomStep ? StepEnum.Custom : StepEnum.Complete;
      case StepEnum.Custom:
        return StepEnum.Complete;
      default:
        return nextStep;
    }
  }
  return nextStep;
};

const getStepConfig = (skipHeader: boolean, customStep?: CSVImporterProps['customStep']) => {
  const steps = [
    { label: "Upload", id: Steps.Upload },
    { label: "Select Header", id: Steps.RowSelection, disabled: skipHeader },
    { label: "Map Columns", id: Steps.MapColumns },
  ];

  if (customStep) {
    steps.push({ label: customStep.name, id: Steps.Custom });
  }

  return steps;
};

function useStepNavigation(initialStep: number, skipHeader: boolean, customStep?: CSVImporterProps['customStep']) {
  const [t] = useTranslation();
  const translatedSteps = getStepConfig(skipHeader, customStep).map((step) => ({
    ...step,
    label: t(step.label),
  }));
  const stepper = useStepper(translatedSteps, StepEnum.Upload, skipHeader);
  const [storageStep, setStorageStep] = useMutableLocalStorage(`tf_steps`, "");
  const [currentStep, setCurrentStep] = useState(initialStep);

  const goBack = (backStep = 0) => {
    backStep = backStep || currentStep - 1 || 0;
    setStep(backStep);
  };

  const goNext = (nextStep = 0) => {
    nextStep = nextStep || currentStep + 1 || 0;
    const calculatedStep = calculateNextStep(nextStep, skipHeader, !!customStep);
    setStep(calculatedStep);
  };

  const setStep = (newStep: number) => {
    setCurrentStep(newStep);
    setStorageStep(newStep);
    stepper.setCurrent(newStep);
  };

  useEffect(() => {
    stepper.setCurrent(storageStep || 0);
    setCurrentStep(storageStep || 0);
  }, [storageStep]);

  return {
    currentStep: storageStep || currentStep,
    setStep,
    goBack,
    goNext,
    stepper,
    stepId: stepper?.step?.id,
    setStorageStep,
  };
}

export default useStepNavigation;
