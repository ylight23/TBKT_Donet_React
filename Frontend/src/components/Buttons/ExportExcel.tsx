import React, { useState } from 'react';
import { Button, CircularProgress, ButtonProps } from '@mui/material';
import { Download } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import notify from '../../utils/notification';

type ColumnMapping = Record<string, string | ((item: any) => any)>;

interface ExportExcelProps {
    data?: any[];
    columnMapping?: ColumnMapping;
    fileName?: string;
    sheetName?: string;
    disabled?: boolean;
    buttonText?: string;
    buttonProps?: ButtonProps;
}

const ExportExcel: React.FC<ExportExcelProps> = ({ 
    data = [],
    columnMapping = {},
    fileName = 'Export',
    sheetName = 'Data',
    disabled = false,
    buttonText = 'Xuất Excel',
    buttonProps = {},
}) => {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = (): void => {
        try {
            setIsExporting(true);
            console.log('[ExportExcel] Starting export:', { 
                rowCount: data.length, 
                columns: Object.keys(columnMapping).length 
            });

            // Validate data
            if (!data || data.length === 0) {
                notify.warn('Không có dữ liệu để xuất');
                return;
            }

            if (!columnMapping || Object.keys(columnMapping).length === 0) {
                notify.error('Chưa định nghĩa cột để xuất');
                return;
            }

            // Prepare data for export
            const exportData = data.map((item, index) => {
                const row: Record<string, any> = { 'STT': index + 1 };
                
                // Map data fields to Excel columns
                Object.entries(columnMapping).forEach(([excelCol, dataKey]) => {
                    let value: any;
                    
                    // Support nested keys with dot notation (e.g., 'office.name')
                    if (typeof dataKey === 'string' && dataKey.includes('.')) {
                        value = dataKey.split('.').reduce((obj: any, key) => obj?.[key], item);
                    } 
                    // Support function for custom value transformation
                    else if (typeof dataKey === 'function') {
                        value = dataKey(item);
                    } 
                    // Direct key access
                    else {
                        value = item[dataKey as string];
                    }
                    
                    // Format value for Excel
                    if (typeof value === 'boolean') {
                        row[excelCol] = value ? 'Có' : 'Không';
                    } else if (value === null || value === undefined) {
                        row[excelCol] = '';
                    } else if (value instanceof Date) {
                        row[excelCol] = value.toLocaleDateString('vi-VN');
                    } else {
                        row[excelCol] = value;
                    }
                });
                
                return row;
            });

            console.log('[ExportExcel] Prepared export data:', exportData.length, 'rows');

            // Create workbook
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, sheetName);

            // Auto-size columns (approximation)
            const colWidths: { wch: number }[] = [];
            
            // STT column - narrow
            colWidths.push({ wch: 5 });
            
            // Data columns - calculate width based on header length
            Object.keys(columnMapping).forEach(header => {
                const maxLength = Math.max(
                    header.length,
                    ...exportData.slice(0, 100).map(row => String(row[header] || '').length)
                );
                colWidths.push({ wch: Math.min(Math.max(maxLength + 2, 10), 50) });
            });
            
            ws['!cols'] = colWidths;

            // Export file with timestamp
            const timestamp = new Date().toISOString().split('T')[0];
            const fullFileName = `${fileName}_${timestamp}.xlsx`;
            
            XLSX.writeFile(wb, fullFileName);

            notify.success(`Đã xuất ${data.length} bản ghi ra file ${fullFileName}`);
            console.log('[ExportExcel] Export success:', fullFileName);
            
        } catch (error) {
            console.error('[ExportExcel] Export error:', error);
            notify.error('Lỗi khi xuất file Excel: ' + (error as Error).message);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Button
            variant="contained"
            color="success"
            startIcon={isExporting ? <CircularProgress size={16} /> : <Download />}
            onClick={handleExport}
            disabled={isExporting || disabled || !data || data.length === 0}
            {...buttonProps}
        >
            {buttonText}
        </Button>
    );
};

export default ExportExcel;
