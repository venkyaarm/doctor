import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import "./sidebar.css";
import {
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  IconButton,
  Toolbar,
  AppBar,
  Typography,
  Tooltip,
  Box,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import QrCodeIcon from "@mui/icons-material/QrCode";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SettingsIcon from "@mui/icons-material/Settings";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import MedicationIcon from "@mui/icons-material/Medication";
import SpaIcon from "@mui/icons-material/Spa";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import AssignmentIcon from "@mui/icons-material/Assignment";
import RestaurantIcon from "@mui/icons-material/Restaurant";

export default function SidebarLayout() {
  const [open, setOpen] = useState(true);
  const location = useLocation();

  const toggleDrawer = () => {
    setOpen(!open);
  };

  const menuItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "QR Generator", icon: <QrCodeIcon />, path: "/qrgenerator" },
    { text: "Account", icon: <AccountCircleIcon />, path: "/account" },
    { text: "Settings", icon: <SettingsIcon />, path: "/settings" },
    { text: "Ask Doctor", icon: <MedicalServicesIcon />, path: "/askdoctor" },
    { text: "Tablet & Tonic Analysis", icon: <MedicationIcon />, path: "/tabletandtonicanalysis" },
    { text: "Skin Care", icon: <SpaIcon />, path: "/skincare" },
    { text: "Emergency", icon: <LocalHospitalIcon />, path: "/emergency" },
    { text: "Hospitals Near Me", icon: <LocalHospitalIcon />, path: "/hospitalsnearme" },
    { text: "Report Analysis", icon: <AssignmentIcon />, path: "/reportanalysis" },
    { text: "Food/Diet Recommendation", icon: <RestaurantIcon />, path: "/foodordietrecommendation" },
  ];

  return (
    <div style={{ display: "flex" }}>
      {/* Top App Bar */}
      <AppBar position="fixed" sx={{ zIndex: 1300, background: "#4e54c8" }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={toggleDrawer} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap>
            🏥 Hospital App
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={open}
        sx={{
          "& .MuiDrawer-paper": {
            width: open ? 240 : 70,
            boxSizing: "border-box",
            background: "linear-gradient(180deg, #4e54c8, #8f94fb)",
            color: "white",
            overflow: "hidden",
            transition: "width 0.3s ease",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {/* Sidebar Header */}
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            background: "inherit",
            padding: "16px",
            textAlign: open ? "center" : "left",
            borderBottom: "1px solid rgba(255,255,255,0.3)",
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            {open ? "Menu" : "☰"}
          </Typography>
        </Box>

        {/* Scrollable Menu Items */}
        <Box sx={{ flex: 1, overflowY: "auto" }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <Tooltip title={!open ? item.text : ""} placement="right">
                  <ListItemButton
                    component={Link}
                    to={item.path}
                    selected={location.pathname === item.path}
                    sx={{
                      "&.Mui-selected": {
                        background: "rgba(255,255,255,0.2)",
                        borderRadius: "8px",
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: "white", minWidth: 40 }}>
                      {item.icon}
                    </ListItemIcon>
                    {open && (
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{
                          fontWeight: "bold",
                          fontSize: "1rem",
                        }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <main
        style={{
          flexGrow: 1,
          padding: "20px",
          marginLeft: open ? 240 : 70,
          transition: "margin-left 0.3s ease",
          background: "#f8f9fa",
          minHeight: "100vh",
        }}
      >
        <Toolbar /> {/* Spacer for AppBar height */}
        <Outlet />
      </main>
    </div>
  );
}
