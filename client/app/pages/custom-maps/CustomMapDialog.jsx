import { get } from "lodash";
import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import Button from "antd/lib/button";
import Modal from "antd/lib/modal";
import Form from "antd/lib/form";
import Input from "antd/lib/input";
import Upload from "antd/lib/upload";
import UploadOutlined from "@ant-design/icons/UploadOutlined";
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";

function CustomMapDialog({ customMap, dialog, readOnly }) {
  const isEditing = !!get(customMap, "id");
  const [name, setName] = useState(get(customMap, "name", ""));
  const [geojson, setGeojson] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setGeojson(e.target.result);
      setFileName(file.name);
      setError(null);
    };
    reader.readAsText(file);
    return false; // prevent default upload
  }, []);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!isEditing && !geojson) {
      setError("Please select a GeoJSON file.");
      return;
    }

    setSubmitting(true);
    const customMapId = get(customMap, "id");
    const values = { name: name.trim() };
    if (geojson) {
      values.geojson = geojson;
    }

    dialog
      .close(customMapId ? { id: customMapId, ...values } : values)
      .then(() => setSubmitting(false))
      .catch((err) => {
        setSubmitting(false);
        setError(get(err, "response.data.message", "Failed saving custom map."));
      });
  }, [dialog, customMap, name, geojson, isEditing]);

  return (
    <Modal
      {...dialog.props}
      title={isEditing ? customMap.name : "Create Custom Map"}
      footer={[
        <Button key="cancel" {...dialog.props.cancelButtonProps} onClick={dialog.dismiss}>
          {readOnly ? "Close" : "Cancel"}
        </Button>,
        !readOnly && (
          <Button
            key="submit"
            {...dialog.props.okButtonProps}
            disabled={readOnly || submitting || dialog.props.okButtonProps.disabled}
            onClick={handleSubmit}
            type="primary"
            loading={submitting}
            data-test="SaveCustomMapButton"
          >
            {isEditing ? "Save" : "Create"}
          </Button>
        ),
      ]}
      wrapProps={{
        "data-test": "CustomMapDialog",
      }}
    >
      <Form layout="vertical">
        <Form.Item label="Name" required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={readOnly}
            autoFocus={!isEditing}
            data-test="CustomMapName"
          />
        </Form.Item>
        <Form.Item label="GeoJSON File" required={!isEditing}>
          <Upload
            accept=".geojson,.json"
            beforeUpload={handleFileSelect}
            showUploadList={false}
            disabled={readOnly}
          >
            <Button icon={<UploadOutlined />} disabled={readOnly} data-test="CustomMapFileUpload">
              {fileName || "Select File"}
            </Button>
          </Upload>
          {fileName && <span className="m-l-10">{fileName}</span>}
          {isEditing && !fileName && (
            <span className="text-muted m-l-10">Leave empty to keep current map data.</span>
          )}
        </Form.Item>
        {error && <div className="text-danger">{error}</div>}
      </Form>
    </Modal>
  );
}

CustomMapDialog.propTypes = {
  dialog: DialogPropType.isRequired,
  customMap: PropTypes.object,
  readOnly: PropTypes.bool,
};

CustomMapDialog.defaultProps = {
  customMap: null,
  readOnly: false,
};

export default wrapDialog(CustomMapDialog);
