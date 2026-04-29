import React from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import DynamicDataForm from '../../CauHinhThamSo/subComponents/DynamicDataForm';
import type { CreateDialogState } from '../types';
import { FormSkeleton } from '../../../components/Skeletons';

type Props = {
  state: CreateDialogState;
  titleBg: string;
  onClose: () => void;
  onSubmit: () => void;
  onChange: (key: string, value: string) => void;
};

const DynamicRowDialog: React.FC<Props> = ({ state, titleBg, onClose, onSubmit, onChange }) => (
  <Dialog open={state.open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle sx={{ background: titleBg, borderBottom: '1px solid', borderColor: 'divider' }}>
      Them du lieu
    </DialogTitle>
    <DialogContent dividers>
      {state.loading && (
        <FormSkeleton rows={5} cols={2} />
      )}
      {!state.loading && state.error && <Alert severity="warning">{state.error}</Alert>}
      {!state.loading && !state.error && state.info && <Alert severity="info">{state.info}</Alert>}
      {!state.loading && !state.error && (
        <DynamicDataForm
          fields={state.fields}
          tabGroups={state.tabGroups}
          data={state.values}
          errors={state.errors}
          onChange={onChange}
        />
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Dong</Button>
      <Button
        variant="contained"
        onClick={onSubmit}
        disabled={state.loading || state.submitLoading || state.fields.length === 0}
      >
        {state.submitLoading ? 'Dang gui...' : state.mode === 'edit' ? 'Cap nhat' : 'Luu'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default DynamicRowDialog;
