import React, { useEffect, useState } from 'react';
import { Render, type Config, type Data } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { PUCK_CONFIG } from '../../features/templateRuntime/puckConfig';
import { toEditorData } from '../../features/templateRuntime/editorData';
import thamSoApi from '../../apis/thamSoApi';
import { TemplateRuntimeProvider } from '../../features/templateRuntime/runtimeContext';

interface TemplateRendererProps {
  templateKey: string;
  defaultSourceKey?: string;
  defaultColumnLabels?: Record<string, string>;
  defaultColumns?: Array<{ key: string; name: string }>;
  fillParent?: boolean;
}

const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  templateKey,
  defaultSourceKey,
  defaultColumnLabels,
  defaultColumns,
  fillParent,
}) => {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!templateKey) {
      setLoading(false);
      setError('Chưa gán template cho menu này.');
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const templates = await thamSoApi.getListTemplateLayouts();
        const found = templates.find((t) => t.key === templateKey);
        if (cancelled) return;
        if (!found) {
          setError(`Không tìm thấy template "${templateKey}".`);
          setData(null);
        } else {
          if (!found.schemaJson?.trim()) {
            setError(`Template "${templateKey}" chua co schemaJson.`);
            setData(null);
            return;
          }

          try {
            JSON.parse(found.schemaJson);
          } catch {
            setError(`Template "${templateKey}" co JSON khong hop le.`);
            setData(null);
            return;
          }

          const nextData = toEditorData(found.schemaJson);
          if (!nextData.content || nextData.content.length === 0) {
            setError(`Template "${templateKey}" khong co block nao de render.`);
            setData(null);
            return;
          }

          setData(nextData);
        }
      } catch {
        if (!cancelled) setError('Lỗi tải template.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [templateKey]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Stack spacing={1} sx={{ m: 2 }}>
        <Alert severity="warning">{error}</Alert>
        <Typography variant="body2" color="text.secondary">
          Vui long kiem tra lai cau hinh template trong man hinh CauHinhTemplate.
        </Typography>
      </Stack>
    );
  }

  if (!data) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Chua co du lieu template hop le de render.
      </Alert>
    );
  }

  return (
    <TemplateRuntimeProvider value={{ isRuntime: true, defaultSourceKey, defaultColumnLabels, defaultColumns }}>
      <Box
        sx={{
          minHeight: fillParent ? '100%' : undefined,
          height: fillParent ? '100%' : undefined,
          display: fillParent ? 'flex' : undefined,
          flexDirection: fillParent ? 'column' : undefined,
          '& [data-puck-component]': { marginTop: 0, marginBottom: 0 },
          '& [data-puck-component] + [data-puck-component]': { marginTop: '2px' },
        }}
      >
        <Render config={PUCK_CONFIG as Config} data={data} />
      </Box>
    </TemplateRuntimeProvider>
  );
};

export default TemplateRenderer;
