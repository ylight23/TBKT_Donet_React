import React from 'react';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import FlightIcon from '@mui/icons-material/Flight';
import SecurityIcon from '@mui/icons-material/Security';
import UpgradeIcon from '@mui/icons-material/Upgrade';
import ShieldIcon from '@mui/icons-material/Shield';
import HandymanIcon from '@mui/icons-material/Handyman';
import ConstructionIcon from '@mui/icons-material/Construction';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TimerIcon from '@mui/icons-material/Timer';

export const iconMapping: Record<string, React.ReactNode> = {
    'Assignment': <AssignmentIcon />,
    'DirectionsBoat': <DirectionsBoatIcon />,
    'Flight': <FlightIcon />,
    'Security': <SecurityIcon />,
    'Upgrade': <UpgradeIcon />,
    'Shield': <ShieldIcon />,
    'Handyman': <HandymanIcon />,
    'Construction': <ConstructionIcon />,
    'Inventory': <InventoryIcon />,
    'LocalShipping': <LocalShippingIcon />,
    'Timer': <TimerIcon />,
};

export const nameToIcon = (name: string): React.ReactNode => {
    return iconMapping[name] || <AssignmentIcon />;
};

export const iconToName = (node: React.ReactNode): string => {
    if (!node) return 'Assignment';
    // Note: This is an easier way to handle it since we use strings in the seeds
    if (typeof node === 'string') return node;

    // Try to find by display name or type
    const reactNode = node as any;
    const typeName = reactNode.type?.displayName || reactNode.type?.name;

    if (typeName?.includes('Assignment')) return 'Assignment';
    if (typeName?.includes('DirectionsBoat')) return 'DirectionsBoat';
    if (typeName?.includes('Flight')) return 'Flight';
    if (typeName?.includes('Security')) return 'Security';
    if (typeName?.includes('Upgrade')) return 'Upgrade';
    if (typeName?.includes('Shield')) return 'Shield';
    if (typeName?.includes('Handyman')) return 'Handyman';
    if (typeName?.includes('Construction')) return 'Construction';
    if (typeName?.includes('Inventory')) return 'Inventory';
    if (typeName?.includes('LocalShipping')) return 'LocalShipping';
    if (typeName?.includes('Timer')) return 'Timer';

    return 'Assignment';
};
