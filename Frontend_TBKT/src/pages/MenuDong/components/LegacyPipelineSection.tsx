import React from "react";
import { Alert, Box, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import LegacyMenuGrid from "./LegacyMenuGrid";

type Props = {
  title: string;
  gridCount: number;
  columnCount: number;
  dsDisplayName: string;
  loadError: string;
  visibleColumnLabels: string[];
  mappedRows: Record<string, unknown>[];
  gridColumns: GridColDef[];
  loadingRows: boolean;
  onView: (row: Record<string, unknown>) => void;
  onEdit: (row: Record<string, unknown>) => Promise<void>;
  onDelete: (row: Record<string, unknown>) => Promise<void>;
  onPrint: (row: Record<string, unknown>) => void;
  onExport: (row: Record<string, unknown>) => void;
};

const LegacyPipelineSection: React.FC<Props> = ({
  title,
  gridCount,
  columnCount,
  dsDisplayName,
  loadError,
  visibleColumnLabels,
  mappedRows,
  gridColumns,
  loadingRows,
  onView,
  onEdit,
  onDelete,
  onPrint,
  onExport,
}) => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Menu nay dang cau hinh {gridCount} DataGrid, moi grid hien thi {" "}
        {columnCount} cot, source: <strong>{dsDisplayName}</strong>.
      </Typography>

      {loadError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      <LegacyMenuGrid
        gridCount={gridCount}
        columnLabels={visibleColumnLabels}
        mappedRows={mappedRows}
        gridColumns={gridColumns}
        loadingRows={loadingRows}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
        onPrint={onPrint}
        onExport={onExport}
      />
    </Box>
  );
};

export default LegacyPipelineSection;