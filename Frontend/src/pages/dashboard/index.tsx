import React, { useEffect, useState } from 'react';
import { Box } from "@mui/material";
import Header from "../../components/Header";
import Grid from '@mui/material/Grid';
import GridCard from '../../components/GridCard/index';
import officeApi from '../../apis/officeApi';
import employeeApi from '../../apis/employeeApi';
import { useSelector } from "react-redux";
import { RootState } from '../../store';
import { useAsgardeo } from "@asgardeo/react";

const Dashboard: React.FC = () => {
    const { loading } = useSelector((state: RootState) => state.employeeReducer);
    const { accessToken, isAuthenticated } = useSelector((state: RootState) => state.authReducer);
    const { isSignedIn, isLoading } = useAsgardeo();
    const [totalOffice, setTotalOffice] = useState<number>(0);
    const [totalEmployee, setTotalEmployee] = useState<number>(0);

    useEffect(() => {
        // Wait for SDK to finish loading AND for accessToken to be available in Redux
        if (isLoading) {
            console.log('[Dashboard] SDK still loading, waiting...');
            return;
        }
        
        if (!isSignedIn || !isAuthenticated || !accessToken) {
            console.log('[Dashboard] Skipping API calls - no token yet', { isSignedIn, isAuthenticated, hasToken: !!accessToken });
            return;
        }
        
        console.log('[Dashboard] ✅ Token available, fetching data...');
        
        employeeApi.getListEmployees()
            .then(res => {
                console.log('[Dashboard] Employees fetched:', res?.length);
                setTotalEmployee(res?.length || 0);
            })
            .catch((err) => {
                console.error('[Dashboard] Failed to fetch employees:', err);
                setTotalEmployee(0);
            });

        officeApi.getListOffices({ loadAll: true })
            .then(res => {
                console.log('[Dashboard] Offices fetched:', res?.length);
                setTotalOffice(res?.length || 0);
            })
            .catch((err) => {
                console.error('[Dashboard] Failed to fetch offices:', err);
                setTotalOffice(0);
            });
    }, [isSignedIn, isLoading, isAuthenticated, accessToken]);

    return (
        <Box sx={{ margin: "10px" }}>
            <Header title="DASHBOARD" subtitle="Bảng điều hành" />
            <Box sx={{ margin: "10px 0" }}>
                <Grid container spacing={2}>
                    <GridCard
                        xs={6}
                        title="Tổng số cán bộ"
                        content={loading ? '...' : totalEmployee}
                    />
                    <GridCard
                        xs={6}
                        title="Tổng số đơn vị"
                        content={loading ? '...' : totalOffice}
                    />
                </Grid>
            </Box>
        </Box>
    );
};

export default Dashboard;
