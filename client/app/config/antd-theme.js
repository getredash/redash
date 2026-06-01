import ConfigProvider from "antd/lib/config-provider";

const antdTheme = {
  token: {
    colorPrimary: "#2196f3",
    colorInfo: "#03a9f4",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
    fontSize: 13,
    borderRadius: 2,
    borderRadiusLG: 4,
    colorBorder: "#e8e8e8",
    colorSplit: "#f0f0f0",
    colorText: "#595959",
    controlHeight: 35,
  },
};

// Apply theme to static methods like Modal.confirm(), Modal.warning(), etc.
ConfigProvider.config({
  theme: antdTheme,
});

export default antdTheme;
