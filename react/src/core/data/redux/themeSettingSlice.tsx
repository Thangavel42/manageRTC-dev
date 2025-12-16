import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  dataLayout: localStorage.getItem("dataLayout") || "default",
  dataWidth: localStorage.getItem("dataWidth") || "fluid",
  dataCard: localStorage.getItem("dataCard") || "bordered",
  dataSidebar: localStorage.getItem("dataSidebar") || "all",
  dataSidebarAll: localStorage.getItem("dataSidebarAll") || "57, 22, 148",
  dataTopBar: localStorage.getItem("dataTopBar") || "all",
  dataTopbarAll: localStorage.getItem("dataTopbarAll") || "123, 47, 247",
  dataTopBarColor: localStorage.getItem("dataTopBarColor") || "white", 
  dataTopBarColorAll: localStorage.getItem("dataTopBarColorAll") || "",
  dataColor: localStorage.getItem("dataColor") || "all",
  dataColorAll: localStorage.getItem("dataColorAll") || "242, 7, 231",
  dataTheme: localStorage.getItem("dataTheme") || "light",
  dataSidebarBg: localStorage.getItem("dataSidebarBg") || "",
  dataTopbarBg: localStorage.getItem("dataTopbarBg") || "",
  dataLoader: localStorage.getItem("dataLoader") || "enable",
  isRtl: localStorage.getItem("rtl") || false,
  headerCollapse: false,
};


const themeSettingSlice = createSlice({
  name: "themeSetting",
  initialState,
  reducers: {
    setHeaderCollapse: (state, { payload }) => {
      state.headerCollapse = payload;
    },
    setDataLayout: (state, action) => {
      state.dataLayout = action.payload;
      localStorage.setItem("dataLayout", action.payload);
      document.documentElement.setAttribute("data-layout", action.payload);
    },
    setDataWidth: (state, action) => {
      state.dataWidth = action.payload;
      localStorage.setItem("dataWidth", action.payload);
      document.documentElement.setAttribute("data-width", action.payload);
    },
    setDataCard: (state, action) => {
      state.dataCard = action.payload;
      localStorage.setItem("dataCard", action.payload);
      document.documentElement.setAttribute("data-card", action.payload);
    },
    setDataSidebar: (state, action) => {
      state.dataSidebar = action.payload;
      localStorage.setItem("dataSidebar", action.payload);
      document.documentElement.setAttribute("data-sidebar", action.payload);
    },
    setDataSidebarAll: (state, action) => {
      state.dataSidebarAll = action.payload;
      localStorage.setItem("dataSidebarAll", action.payload);
    },
    setDataColorAll: (state, action) => {
      state.dataColorAll = action.payload;
      localStorage.setItem("dataColorAll", action.payload);
    },
    setDataTopBarColorAll: (state, action) => {
      state.dataTopBarColorAll = action.payload;
      localStorage.setItem("dataTopBarColorAll", action.payload);
    },
    setDataTopbarAll: (state, action) => {
      state.dataTopbarAll = action.payload;
      localStorage.setItem("dataTopbarAll", action.payload);
    },
    setDataTheme: (state, action) => {
      document.documentElement.setAttribute("data-theme", action.payload);
      state.dataTheme = action.payload;
      localStorage.setItem("dataTheme", action.payload);
    },
    setTopBarColor: (state, action) => {
      state.dataTopBar = action.payload;
      localStorage.setItem("dataTopBar", action.payload);
      document.documentElement.setAttribute("data-topbar", action.payload);
    },
    setTopBarColor2: (state, action) => {
      state.dataTopBarColor = action.payload;
      localStorage.setItem("dataTopBarColor", action.payload);
      document.documentElement.setAttribute("data-topbarcolor", action.payload);
    },

    setDataSidebarBg: (state, action) => {
      state.dataSidebarBg = action.payload;
      localStorage.setItem("dataSidebarBg", action.payload);
      document.body.setAttribute("data-sidebarbg", action.payload);
    },
    setDataTopbarBg: (state, action) => {
      state.dataTopbarBg = action.payload;
      localStorage.setItem("dataTopbarBg", action.payload);
      document.body.setAttribute("data-topbarbg", action.payload);
    },
    setDataColor: (state, action) => {
      state.dataColor = action.payload;
      localStorage.setItem("dataColor", action.payload);
      document.documentElement.setAttribute("data-color", action.payload);
    },
    setLoader: (state, action) => {
      state.dataLoader = action.payload;
      localStorage.setItem("dataLoader", action.payload);
      document.documentElement.setAttribute("data-loader", action.payload);
    },
    setRtl: (state, action) => {
      state.isRtl = action.payload;
      localStorage.setItem("rtl", action.payload);
      document.body.setAttribute("class", action.payload);
    },
    resetAllMode: (state: any) => {
  state.dataLayout = "default";
  state.dataWidth = "fluid";
  state.dataCard = "bordered";
  state.dataSidebar = "all";
  state.dataSidebarAll = "57, 22, 148";
  state.dataTopBar = "all";
  state.dataTopbarAll = "123, 47, 247";
  state.dataTopBarColor = "white";
  state.dataTopBarColorAll = "";
  state.dataColor = "all";
  state.dataColorAll = "242, 7, 231";
  state.dataTheme = "light";
  state.dataSidebarBg = "";
  state.dataTopbarBg = "";
  state.dataLoader = "enable";
  state.isRtl = "";
  state.headerCollapse = false;

  localStorage.setItem("dataLayout", "default");
  localStorage.setItem("dataWidth", "fluid");
  localStorage.setItem("dataCard", "bordered");
  localStorage.setItem("dataSidebar", "all");
  localStorage.setItem("dataSidebarAll", "57, 22, 148");
  localStorage.setItem("dataTopBar", "all");
  localStorage.setItem("dataTopbarAll", "123, 47, 247");
  localStorage.setItem("dataTopBarColor", "white");
  localStorage.setItem("dataTopBarColorAll", "");
  localStorage.setItem("dataColor", "all");
  localStorage.setItem("dataColorAll", "242, 7, 231");
  localStorage.setItem("dataTheme", "light");
  localStorage.setItem("dataSidebarBg", "");
  localStorage.setItem("dataTopbarBg", "");
  localStorage.setItem("dataLoader", "enable");
  localStorage.setItem("rtl", "");
},

  },
});

export const {
  setDataLayout,
  setDataWidth,
  setDataCard,
  resetAllMode,
  setTopBarColor,
  setDataTheme,
  setDataSidebar,
  setDataSidebarAll,
  setDataColorAll,
  setDataTopBarColorAll,
  setDataTopbarAll,
  setDataSidebarBg,
  setDataTopbarBg,
  setHeaderCollapse,
  setDataColor,
  setLoader,
  setTopBarColor2,
  setRtl,
} = themeSettingSlice.actions;

export default themeSettingSlice.reducer;
