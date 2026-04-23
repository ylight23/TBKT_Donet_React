import React from 'react';
import { LogType } from '../../types/trangBiLog';

export interface TrangBiLogSidePanelProps {
    open: boolean;
    onClose: () => void;
    logType: LogType;
    trangBiId: string;
    trangBiName?: string;
    editingLogId?: string | null;
    onSaved?: () => void;
    width?: number | string;
}

// NOTE:
// TrangBiLogSidePanel is temporarily disabled by business decision.
// Runtime keeps this stub to preserve compatibility with existing imports/usages
// while pausing all side-panel log flows.
const TrangBiLogSidePanel: React.FC<TrangBiLogSidePanelProps> = () => null;

export default TrangBiLogSidePanel;
