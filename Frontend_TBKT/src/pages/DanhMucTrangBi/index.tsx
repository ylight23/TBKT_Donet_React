import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import catalogApi, { type CatalogTree, type TrangBiSpecializationOption } from '../../apis/catalogApi';
import { fetchThamSoSchema } from '../../store/reducer/thamSo';
import type { RootState, AppDispatch } from '../../store';
import CnTabBar from './CnTabBar';
import CatalogTreePanel from './CatalogTreePanel';
import TrangBiFormPanel from './TrangBiFormPanel';

const TREE_PANEL_WIDTH = 320;

const DanhMucTrangBi: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { loaded: thamSoLoaded } = useSelector((s: RootState) => s.thamSoReducer);

    const [cnOptions, setCnOptions] = useState<TrangBiSpecializationOption[]>([]);
    const [cnLoading, setCnLoading] = useState(true);
    const [selectedCn, setSelectedCn] = useState('');
    const [selectedNode, setSelectedNode] = useState<CatalogTree | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Load ThamSo schema (FormConfigs) if not yet loaded
    useEffect(() => {
        if (!thamSoLoaded) {
            void dispatch(fetchThamSoSchema());
        }
    }, [thamSoLoaded, dispatch]);

    // Load CN options once
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setCnLoading(true);
            try {
                const opts = await catalogApi.getTrangBiSpecializationOptions();
                if (!cancelled) {
                    setCnOptions(opts);
                    if (opts.length > 0 && !selectedCn) {
                        setSelectedCn(opts[0].id);
                    }
                }
            } catch {
                // silent
            } finally {
                if (!cancelled) setCnLoading(false);
            }
        };
        void load();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCnChange = (cn: string) => {
        setSelectedCn(cn);
        setSelectedNode(null);
    };

    const handleSaved = (id: string, isNew: boolean) => {
        if (isNew) {
            // Refresh tree to show newly added node
            setRefreshKey((k) => k + 1);
        }
    };

    if (cnLoading && cnOptions.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Stack sx={{ height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
            {/* Page title */}
            <Box sx={{ px: 2, pt: 2, pb: 0.5 }}>
                <Typography variant="h6" fontWeight={700}>
                    Danh muc trang bi
                </Typography>
            </Box>

            {/* CN Tab bar */}
            <CnTabBar
                options={cnOptions}
                loading={cnLoading}
                value={selectedCn}
                onChange={handleCnChange}
            />

            {!selectedCn ? (
                <Box sx={{ p: 4 }}>
                    <Typography color="text.secondary">Chon chuyen nganh de bat dau.</Typography>
                </Box>
            ) : (
                <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
                    {/* Left: virtualized tree */}
                    <Paper
                        variant="outlined"
                        square
                        sx={{
                            width: TREE_PANEL_WIDTH,
                            flexShrink: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            borderTop: 0,
                            borderBottom: 0,
                            borderLeft: 0,
                        }}
                    >
                        <CatalogTreePanel
                            key={`${selectedCn}-${refreshKey}`}
                            cn={selectedCn}
                            selectedId={selectedNode?.id ?? ''}
                            onSelect={setSelectedNode}
                        />
                    </Paper>

                    {/* Right: form panel */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                        <TrangBiFormPanel
                            cn={selectedCn}
                            cnLabel={cnOptions.find((o) => o.id === selectedCn)?.label ?? selectedCn}
                            cnOptions={cnOptions}
                            node={selectedNode}
                            onSaved={handleSaved}
                        />
                    </Box>
                </Box>
            )}
        </Stack>
    );
};

export default DanhMucTrangBi;
