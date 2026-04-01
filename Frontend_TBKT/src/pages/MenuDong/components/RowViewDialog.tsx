import React from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import type { ViewDialogState } from '../types';

type Props = {
  state: ViewDialogState;
  titleBg: string;
  onClose: () => void;
};

const RowViewDialog: React.FC<Props> = ({ state, titleBg, onClose }) => (
  <Dialog open={state.open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle sx={{ background: titleBg, borderBottom: '1px solid', borderColor: 'divider' }}>
      {state.title}
    </DialogTitle>
    <DialogContent dividers>
      <Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12 }}>
        {JSON.stringify(state.row ?? {}, null, 2)}
      </Box>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Dong</Button>
    </DialogActions>
  </Dialog>
);

export default RowViewDialog;

