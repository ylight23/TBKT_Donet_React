import React, { Suspense } from 'react';
import Button from '@mui/material/Button';

const ImportExcel = React.lazy(() => import('./ImportExcel'));

type ImportExcelProps = React.ComponentProps<typeof ImportExcel>;

const LazyImportExcel: React.FC<ImportExcelProps> = (props) => (
    <Suspense
        fallback={(
            <Button variant="contained" disabled>
                Đang tải nhập Excel...
            </Button>
        )}
    >
        <ImportExcel {...props} />
    </Suspense>
);

export default LazyImportExcel;
