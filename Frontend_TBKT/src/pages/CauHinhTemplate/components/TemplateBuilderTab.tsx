import React from 'react';
import { Alert } from '@mui/material';
import { TemplateForm } from './TemplateForm';
import { TemplateList } from './TemplateList';
import { useTemplateManager } from '../hooks/useTemplateManager';

const TemplateBuilderTab: React.FC = () => {
    const {
        items, deletedItems, loading, saving, error,
        form, editorData, editingId,
        setForm, setEditorData,
        handleEdit, handleReset, handleSave, handleDelete, handleRestore, handleTogglePublish,
    } = useTemplateManager();

    return (
        <>
            {error && <Alert severity="warning">{error}</Alert>}
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
                deletedItems={deletedItems}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRestore={handleRestore}
                onTogglePublish={handleTogglePublish}
            />
        </>
    );
};

export default TemplateBuilderTab;
