import React, { useState } from 'react';
import { Alert, Box, Card, CardContent, Stack, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import '@puckeditor/core/puck.css';
import { TemplateForm } from './components/TemplateForm';
import { TemplateList } from './components/TemplateList';
import { useTemplateManager } from './hooks/useTemplateManager';
import { useFormConfigManager } from './hooks/useFormConfigManager';
import PageFormConfig from '../CauHinhThamSo/subComponents/PageFormConfig';

type ActiveTab = 'builder' | 'formConfig';

const CauHinhTemplate: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('builder');

  const {
    items, loading, saving, error,
    form, editorData, editingId,
    setForm, setEditorData,
    handleEdit, handleReset, handleSave, handleDelete, handleTogglePublish,
  } = useTemplateManager();

  const formConfig = useFormConfigManager();

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>Thiết kế giao diện (Layout + Form)</Typography>

        <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
          <Typography variant="caption" color="text.disabled">Quy trình:</Typography>
          {([
            { label: '① Tạo template', color: 'primary.main', tooltip: 'Thiết kế layout bằng Puck Editor, đặt tên và key cho template rồi lưu vào DB' },
            { label: '② Ghi file (Export)', color: 'secondary.main', tooltip: 'Xuất template thành file JSON vào public/templates/ để hệ thống đọc khi render' },
            { label: '③ Tạo menu → Gán template', color: 'success.main', tooltip: 'Vào Cấu hình Menu Động → tạo menu item → chọn template key để áp dụng giao diện' },
          ] as const).map(({ label, color, tooltip }, i) => (
            <Stack key={label} direction="row" alignItems="center" spacing={0.5}>
              {i > 0 && <Typography variant="caption" color="text.disabled">→</Typography>}
              <Tooltip title={tooltip} arrow>
                <Typography variant="caption" sx={{ color, cursor: 'help', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}>
                  {label}
                </Typography>
              </Tooltip>
            </Stack>
          ))}
        </Stack>

        <Card sx={{ mb: 0 }}>
          <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
            <Tabs
              value={activeTab}
              onChange={(_, v: ActiveTab) => setActiveTab(v)}
              sx={{ '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minHeight: 38 } }}
            >
              <Tab value="builder" label="Xây dựng template" />
              <Tab value="formConfig" label="Quản lý form nhập" />
            </Tabs>
          </CardContent>
        </Card>

        {error && <Alert severity="warning">{error}</Alert>}

        {activeTab === 'builder' && (
          <>
            <TemplateForm
              form={form}
              editorData={editorData}
              editingId={editingId}
              saving={saving}
              loading={loading}
              onFormChange={setForm}
              onEditorChange={setEditorData}
              onSave={handleSave}
              onReset={handleReset}
            />
            <TemplateList
              items={items}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTogglePublish={handleTogglePublish}
            />
          </>
        )}

        {activeTab === 'formConfig' && (
          <Box sx={{ minHeight: 560 }}>
            <PageFormConfig
              fields={formConfig.fields}
              fieldSets={formConfig.fieldSets}
              forms={formConfig.forms}
              setForms={formConfig.setForms}
              activeFormId={formConfig.activeFormId}
              setActiveFormId={formConfig.setActiveFormId}
            />
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default CauHinhTemplate;
