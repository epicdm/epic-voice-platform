'use client';

/**
 * Comprehensive AMI Dashboard
 * Integrates all AMI features into a unified interface
 */

import { useState, useEffect } from 'react';
import { Tabs, Tab } from '@heroui/tabs';
import { Card, CardBody } from '@heroui/card';
import { Button } from '@heroui/button';
import { useDisclosure } from '@heroui/modal';
import {
  Activity,
  Phone,
  Server,
  Users,
  Mic,
  Eye,
  TrendingUp
} from 'lucide-react';

import AmiDashboard from './AmiDashboard';
import ClickToDialModal from './ClickToDialModal';
import TrunkHealthMonitor from './TrunkHealthMonitor';
import QueueManager from './QueueManager';
import AdvancedCallControls from './AdvancedCallControls';

interface Agent {
  id: string;
  name: string;
  phoneNumber?: string;
}

export default function ComprehensiveAmiDashboard() {
  const [selectedTab, setSelectedTab] = useState('monitoring');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeCalls, setActiveCalls] = useState([]);

  const { isOpen: isDialOpen, onOpen: onDialOpen, onClose: onDialClose } = useDisclosure();

  // Fetch agents on mount
  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      const data = await response.json();
      if (data.success) {
        setAgents(data.agents);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchActiveCalls = async () => {
    try {
      const response = await fetch('/api/ami/channels/active');
      const data = await response.json();
      if (data.success) {
        setActiveCalls(data.channels);
      }
    } catch (error) {
      console.error('Error fetching active calls:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-divider bg-content1">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Call Center Dashboard</h1>
              <p className="text-sm text-default-500">
                Real-time monitoring and control powered by Asterisk AMI
              </p>
            </div>
            <Button
              color="primary"
              startContent={<Phone className="w-4 h-4" />}
              onPress={onDialOpen}
            >
              Click-to-Dial
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <Tabs
          selectedKey={selectedTab}
          onSelectionChange={(key) => setSelectedTab(key as string)}
          size="lg"
          variant="underlined"
          classNames={{
            tabList: "gap-6",
            cursor: "w-full",
            tab: "max-w-fit px-4 h-12",
          }}
        >
          {/* Real-Time Monitoring */}
          <Tab
            key="monitoring"
            title={
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>Live Monitoring</span>
              </div>
            }
          >
            <div className="py-6">
              <AmiDashboard />
            </div>
          </Tab>

          {/* Trunk Health */}
          <Tab
            key="trunks"
            title={
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4" />
                <span>Trunk Health</span>
              </div>
            }
          >
            <div className="py-6">
              <TrunkHealthMonitor />
            </div>
          </Tab>

          {/* Queue Management */}
          <Tab
            key="queues"
            title={
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Queues</span>
              </div>
            }
          >
            <div className="py-6">
              <QueueManager />
            </div>
          </Tab>

          {/* Supervisor Controls */}
          <Tab
            key="supervisor"
            title={
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span>Supervisor</span>
              </div>
            }
          >
            <div className="py-6">
              <AdvancedCallControls
                calls={activeCalls}
                onRefresh={fetchActiveCalls}
              />
            </div>
          </Tab>

          {/* Analytics (Placeholder) */}
          <Tab
            key="analytics"
            title={
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>Analytics</span>
              </div>
            }
          >
            <div className="py-6">
              <Card>
                <CardBody className="text-center py-12">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50 text-default-400" />
                  <h3 className="text-xl font-semibold mb-2">Analytics Coming Soon</h3>
                  <p className="text-default-500">
                    Advanced call analytics, reports, and insights will be available here.
                  </p>
                </CardBody>
              </Card>
            </div>
          </Tab>
        </Tabs>
      </div>

      {/* Click-to-Dial Modal */}
      <ClickToDialModal
        isOpen={isDialOpen}
        onClose={onDialClose}
        agents={agents}
      />
    </div>
  );
}
