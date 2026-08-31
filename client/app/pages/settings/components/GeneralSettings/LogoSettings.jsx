import logoUrl from "@/assets/images/redash_icon_small.png";
import DynamicComponent from "@/components/DynamicComponent";
import useOrganizationSettings from "@/pages/settings/hooks/useOrganizationSettings";
import Avatar from "antd/lib/avatar";
import Form from "antd/lib/form";
import Input from "antd/lib/input";
import Skeleton from "antd/lib/skeleton";
import React from "react";
import { SettingsEditorDefaultProps, SettingsEditorPropTypes } from "../prop-types";

function handleFileChange(e, onChange) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => {
      // Create a 64x64 thumbnail of the image and convert it to base64, also crop the image using a circle.
      const img = new Image();
      img.src = reader.result;
      img.onload = () => {
        const size = Math.min(parseInt(img.width), parseInt(img.height), 64);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = size;
        canvas.height = size;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 0, 0, size, size);
        const thumbnail = canvas.toDataURL("image/png");
        onChange({ logo_url: thumbnail });
      };
    };
    reader.readAsDataURL(file);
  }
}

export default function LogoSettings(props) {
  const { values, onChange, loading } = props;
  const { settings } = useOrganizationSettings({ onError: () => {} });

  return (
    <DynamicComponent name="OrganizationSettings.LogoSettings" {...props}>
      <Form.Item label="Logo" data-test="LogoSettings">
        {loading ? (
          <Skeleton.Input style={{ width: 300, height: 64 }} active />
        ) : (
          <div className="logo-settings" style={{ display: "flex", alignItems: "flex-start", gap: "20px" }}>
            <Avatar
              src={values.logo_url || settings.logo_url || logoUrl}
              alt="Logo Preview"
              size={64}
              data-test="LogoPreview"
              className="d-flex"
            />
            <Input
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/gif, image/svg+xml"
              style={{ width: "300px", height: "64px", lineHeight: "46px" }}
              onChange={(e) => handleFileChange(e, onChange)}
              data-test="LogoUrlInput"
            />
          </div>
        )}
      </Form.Item>
    </DynamicComponent>
  );
}

LogoSettings.propTypes = SettingsEditorPropTypes;

LogoSettings.defaultProps = SettingsEditorDefaultProps;
