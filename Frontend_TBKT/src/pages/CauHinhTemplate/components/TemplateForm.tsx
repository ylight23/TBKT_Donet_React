import React, { type Dispatch, type SetStateAction } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Puck, type Data } from '@puckeditor/core';
import { PUCK_CONFIG } from '../../../features/templateRuntime/puckConfig';
import { toSchemaJson } from '../../../features/templateRuntime/editorData';
import type { FormState } from '../types';

interface TemplateFormProps {
  form: FormState;
  editorData: Data;
  editingId: string;
  saving: boolean;
  loading: boolean;
  onFormChange: Dispatch<SetStateAction<FormState>>;
  onEditorChange: Dispatch<SetStateAction<Data>>;
  onSave: (data?: Data) => void;
  onReset: () => void;
}

export const TemplateForm: React.FC<TemplateFormProps> = ({
  form,
  editorData,
  editingId,
  saving,
  loading,
  onFormChange,
  onEditorChange,
  onSave,
  onReset,
}) => (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Alert severity="info">
            `TemplateLayout.schemaJson` chỉ quyết định layout/runtime block. Form nhập động vẫn phải cấu hình ở `FormConfig`.
          </Alert>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Template key"
            value={form.key}
            onChange={(e) => onFormChange((prev) => ({ ...prev, key: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Tên template"
            value={form.name}
            onChange={(e) => onFormChange((prev) => ({ ...prev, name: e.target.value }))}
            fullWidth
          />
          <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 160 }}>
            <Typography variant="body2">Published</Typography>
            <Switch
              checked={form.published}
              onChange={(e) => onFormChange((prev) => ({ ...prev, published: e.target.checked }))}
            />
          </Stack>
        </Stack>

        <Box
          sx={{
            minHeight: 720,
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            '& .Puck': { minHeight: 720 },
          }}
        >
          <Puck
            key={editingId || '__new__'}
            config={PUCK_CONFIG}
            data={editorData}
            onChange={(nextData) => {
              onEditorChange(nextData as Data);
              onFormChange((prev) => ({ ...prev, schemaJson: toSchemaJson(nextData as Data) }));
            }}
            onPublish={(nextData) => {
              onSave(nextData as Data);
            }}
          />
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="contained"
            onClick={() => onSave()}
            disabled={saving || loading}
          >
            {editingId ? 'Cập nhật template' : 'Thêm template'}
          </Button>
          {editingId && (
            <Button variant="outlined" onClick={onReset}>Huỷ sửa</Button>
          )}
        </Stack>
      </Stack>
    </CardContent>
  </Card>
);
