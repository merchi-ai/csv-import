import Papa from "papaparse";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { IconButton, Button } from "@chakra-ui/button";
import Errors from "../../components/Errors";
import Stepper from "../../components/Stepper";
import { CSVImporterProps } from "../../../types";
import useCustomStyles from "../../hooks/useCustomStyles";
import { Template } from "../../types";
import { convertRawTemplate } from "../../utils/template";
import { parseObjectOrStringJSON } from "../../utils/utils";
import { TemplateColumnMapping } from "../map-columns/types";
import useStepNavigation, { StepEnum } from "./hooks/useStepNavigation";
import { FileData, FileRow } from "./types";
import style from "./style/Main.module.scss";
import Complete from "../complete";
import MapColumns from "../map-columns";
import RowSelection from "../row-selection";
import Uploader from "../uploader";
import { PiX } from "react-icons/pi";
import { useTranslation } from "react-i18next";

export default function Main(props: CSVImporterProps) {
  const {
    isModal = true,
    modalOnCloseTriggered = () => null,
    template,
    onComplete,
    customStyles,
    showDownloadTemplateButton,
    skipHeaderRowSelection,
    customStep,
  } = props;
  const skipHeader = skipHeaderRowSelection ?? false;

  const { t } = useTranslation();

  // Apply custom styles
  useCustomStyles(parseObjectOrStringJSON("customStyles", customStyles));

  // Stepper handler
  const { currentStep, setStep, goNext, goBack, stepper, setStorageStep } = useStepNavigation(StepEnum.Upload, skipHeader, customStep);

  // Error handling
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  // File data
  const emptyData = {
    fileName: "",
    rows: [],
    sheetList: [],
    errors: [],
  };
  const [data, setData] = useState<FileData>(emptyData);

  // Header row selection state
  const [selectedHeaderRow, setSelectedHeaderRow] = useState<number | null>(0);

  // Map of upload column index -> TemplateColumnMapping
  const [columnMapping, setColumnMapping] = useState<{ [index: number]: TemplateColumnMapping }>({});

  // Used in the final step to show a loading indicator while the data is submitting
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [parsedTemplate, setParsedTemplate] = useState<Template>({
    columns: [],
  });

  // Store the processed data for use in custom step and complete
  const [processedData, setProcessedData] = useState<any>(null);

  useEffect(() => {
    const [parsedTemplate, parsedTemplateError] = convertRawTemplate(template);
    if (parsedTemplateError) {
      setInitializationError(parsedTemplateError);
    } else if (parsedTemplate) {
      setParsedTemplate(parsedTemplate);
    }
  }, [template]);

  useEffect(() => {
    // TODO (client-sdk): Have the importer continue where left off if closed
    // Temporary solution to reload state if closed and opened again
    if (data.rows.length === 0 && currentStep !== StepEnum.Upload) {
      reload();
    }
  }, [data]);

  // Actions
  const reload = () => {
    setData(emptyData);
    setSelectedHeaderRow(0);
    setColumnMapping({});
    setDataError(null);
    setProcessedData(null);
    setIsSubmitting(false);
    setStep(StepEnum.Upload);
  };

  const requestClose = () => {
    if (!isModal) {
      return;
    }
    modalOnCloseTriggered && modalOnCloseTriggered();
    if (currentStep === StepEnum.Complete) {
      reload();
    }
  };

  if (initializationError) {
    return (
      <div className={style.wrapper}>
        <Errors error={initializationError} centered />
      </div>
    );
  }

  const renderContent = () => {
    switch (currentStep) {
      case StepEnum.Upload:
        return (
          <Uploader
            template={parsedTemplate}
            skipHeaderRowSelection={skipHeader || false}
            showDownloadTemplateButton={showDownloadTemplateButton}
            setDataError={setDataError}
            onSuccess={async (file: File) => {
              setDataError(null);
              const fileType = file.name.slice(file.name.lastIndexOf(".") + 1);
              if (!["csv", "xls", "xlsx"].includes(fileType)) {
                setDataError(t("Only CSV, XLS, and XLSX files can be uploaded"));
                return;
              }
              const reader = new FileReader();
              const isNotBlankRow = (row: string[]) => row.some((cell) => cell.toString().trim() !== "");
              reader.onload = async (e) => {
                const bstr = e?.target?.result;
                if (!bstr) {
                  return;
                }
                switch (fileType) {
                  case "csv":
                    Papa.parse(bstr.toString(), {
                      complete: function (results) {
                        const csvData = results.data as Array<Array<string>>;
                        const rows: FileRow[] = csvData.filter(isNotBlankRow).map((row: string[], index: number) => ({ index, values: row }));
                        setData({
                          fileName: file.name,
                          rows: rows,
                          sheetList: [],
                          errors: results.errors.map((error) => error.message),
                        });
                        goNext();
                      },
                    });
                    break;
                  case "xlsx":
                  case "xls":
                    const workbook = XLSX.read(bstr as string, { type: "binary" });
                    const sheetList = workbook.SheetNames;
                    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetList[0]], { header: 1 }) as Array<Array<string>>;
                    const rows: FileRow[] = data.filter(isNotBlankRow).map((row: string[], index: number) => ({ index, values: row }));
                    setData({
                      fileName: file.name,
                      rows: rows,
                      sheetList: sheetList,
                      errors: [], // TODO: Handle any parsing errors
                    });
                    goNext();
                    break;
                }
              };

              switch (fileType) {
                case "csv":
                  reader.readAsText(file, "utf-8");
                  break;
                case "xlsx":
                case "xls":
                  reader.readAsBinaryString(file);
                  break;
              }
            }}
          />
        );
      case StepEnum.RowSelection:
        return (
          <RowSelection
            data={data}
            onCancel={reload}
            onSuccess={() => goNext()}
            selectedHeaderRow={selectedHeaderRow}
            setSelectedHeaderRow={setSelectedHeaderRow}
          />
        );
      case StepEnum.MapColumns:
        return (
          <MapColumns
            template={parsedTemplate}
            data={data}
            columnMapping={columnMapping}
            skipHeaderRowSelection={skipHeader}
            selectedHeaderRow={selectedHeaderRow}
            onSuccess={(columnMapping) => {
              setIsSubmitting(true);
              setColumnMapping(columnMapping);

              // TODO (client-sdk): Move this type, add other data attributes (i.e. column definitions), and move the data processing to a function
              type MappedRow = {
                index: number;
                values: Record<string, number | string>;
              };
              const startIndex = (selectedHeaderRow || 0) + 1;
              const headerRowIndex = selectedHeaderRow ?? 0;

              const mappedRows: MappedRow[] = [];
              data.rows.slice(startIndex).forEach((row: FileRow) => {
                const resultingRow: MappedRow = {
                  index: row.index - startIndex,
                  values: {},
                };
                // Add all column values based on include flag
                row.values.forEach((value: string, valueIndex: number) => {
                  const mapping = columnMapping[valueIndex];
                  const columnName = data.rows[headerRowIndex]?.values[valueIndex] || `column_${valueIndex}`;
                  
                  if (mapping?.include) {
                    if (mapping.key) {
                      // If mapped to a template column, use the template key
                      resultingRow.values[mapping.key] = value;
                    } else {
                      // If not mapped but included, use the original column name
                      resultingRow.values[columnName] = value;
                    }
                  }
                });
                mappedRows.push(resultingRow);
              });

              const includedColumns = Object.values(columnMapping).filter(({ include }) => include);

              // Get all CSV columns from the header row
              const allCSVColumns = data.rows[headerRowIndex]?.values.map((columnName: string, index: number) => ({
                key: `column_${index}`,
                name: columnName,
                mapped: columnMapping[index]?.key ? true : false,
                mappedTo: columnMapping[index]?.key || null
              })) || [];

              const onCompleteData = {
                num_rows: mappedRows.length,
                num_columns: allCSVColumns.length,
                error: null,
                columns: allCSVColumns,
                mapped_columns: includedColumns.map(({ key }) => ({ key, name: key })),
                rows: mappedRows,
              };

              setProcessedData(onCompleteData);

              if (customStep) {
                goNext();
              } else {
                onComplete && onComplete(onCompleteData);
                goNext();
              }
            }}
            isSubmitting={isSubmitting}
            onCancel={skipHeader ? reload : () => goBack(StepEnum.RowSelection)}
          />
        );
      case StepEnum.Custom:
        return (
          <div className={style.content}>
            <form>
              {customStep?.component}
              <div className={style.actions}>
                <Button type="button" colorScheme="secondary" onClick={() => {
                  setIsSubmitting(false);
                  goBack();
                }}>
                  {t("Back")}
                </Button>
                <Button
                  colorScheme="primary"
                  onClick={() => {
                    onComplete && onComplete(processedData);
                    goNext();
                  }}
                >
                  {t("Continue")}
                </Button>
              </div>
            </form>
          </div>
        );
      case StepEnum.Complete:
        return (
          <Complete
            reload={reload}
            close={requestClose}
            isModal={isModal}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={style.wrapper}>
      <div>
        <Stepper {...stepper} />
      </div>

      <div className={style.content}>{renderContent()}</div>

      {!!dataError && (
        <div className={style.status}>
          <div></div>
          <Errors error={dataError} centered />
          <div></div>
        </div>
      )}

      {isModal && <IconButton isRound className={style.close} colorScheme="secondary" aria-label="Close" icon={<PiX />} onClick={requestClose} />}
    </div>
  );
}
