import React, { useEffect, useState } from 'react';
import { Render, type Config, type Data } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { Alert, Box, CircularProgress } from '@mui/material';
import { PUCK_CONFIG } from '../../pages/CauHinhTemplate/puckConfig';
import { toEditorData } from '../../pages/CauHinhTemplate/constants';
import thamSoApi from '../../apis/thamSoApi';

interface TemplateRendererProps {
  templateKey: string;
}

const TemplateRenderer: React.FC<TemplateRendererProps> = ({ templateKey }) => {
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
          setData(toEditorData(found.schemaJson));
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
    return <Alert severity="warning" sx={{ m: 2 }}>{error}</Alert>;
  }

  if (!data) return null;

  return (
    <Box
      sx={{
        '& [data-puck-component]': { marginTop: 0, marginBottom: 0 },
        '& [data-puck-component] + [data-puck-component]': { marginTop: '2px' },
      }}
    >
      <Render config={PUCK_CONFIG as Config} data={data} />
    </Box>
  );
};

export default TemplateRenderer;
