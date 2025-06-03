import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Clock, CheckCircle, User } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import apiService from '@/services/api';

const CriticalTasksReport = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCriticalTasksReport();
      
      if (response.success) {
        setReport(response.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to load critical tasks report",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to load report:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load critical tasks report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadReport();
      toast({
        title: "Report Refreshed",
        description: "Critical tasks report has been updated",
      });
    } catch (error) {
      console.error('Failed to refresh report:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-500/20 text-green-300"><CheckCircle className="w-3 h-3 mr-1" /> {status}</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-500/20 text-blue-300"><Clock className="w-3 h-3 mr-1" /> {status}</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-500/20 text-yellow-300"><Clock className="w-3 h-3 mr-1" /> {status}</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-500/20 text-red-300"><AlertTriangle className="w-3 h-3 mr-1" /> {status}</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-300">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'URGENT':
        return <Badge className="bg-red-500/20 text-red-300">{priority}</Badge>;
      case 'HIGH':
        return <Badge className="bg-orange-500/20 text-orange-300">{priority}</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-yellow-500/20 text-yellow-300">{priority}</Badge>;
      case 'LOW':
        return <Badge className="bg-green-500/20 text-green-300">{priority}</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-300">{priority}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 text-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-emerald-400 flex items-center">
            <AlertTriangle className="mr-2 h-6 w-6 text-red-400" />
            Critical Tasks Report
          </CardTitle>
          <CardDescription className="text-gray-400">
            Loading AI-generated analysis of critical and overdue tasks...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 text-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-emerald-400 flex items-center">
            <AlertTriangle className="mr-2 h-6 w-6 text-red-400" />
            Critical Tasks Report
          </CardTitle>
          <CardDescription className="text-gray-400">
            No report data available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRefresh} className="bg-emerald-500 hover:bg-emerald-600">
            <RefreshCw className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Check if the report has the expected structure
  const hasFullReport = report && report.report && report.summary;

  return (
    <Card className="bg-slate-800/50 border-slate-700 text-white shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl text-emerald-400 flex items-center">
              <AlertTriangle className="mr-2 h-6 w-6 text-red-400" />
              Critical Tasks Report
            </CardTitle>
            <CardDescription className="text-gray-400">
              AI-generated analysis of critical and overdue tasks
            </CardDescription>
          </div>
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Simple Report View (when we don't have the full structured report) */}
        {!hasFullReport && (
          <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
            <h3 className="text-lg font-semibold text-emerald-400 mb-2">Executive Summary</h3>
            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
              {typeof report === 'string' ? report : (report?.report || 'No report data available')}
            </div>
          </div>
        )}

        {/* Full Report View */}
        {hasFullReport && (
          <>
            {/* Executive Summary */}
            <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
              <h3 className="text-lg font-semibold text-emerald-400 mb-2">Executive Summary</h3>
              <div className="prose prose-invert prose-sm max-w-none">
                {/* Use pre-wrap as fallback if ReactMarkdown fails */}
                <div className="whitespace-pre-wrap">
                  {report.report}
                </div>
              </div>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4 text-center">
                <h4 className="text-red-400 text-sm font-medium mb-1">Critical Tasks</h4>
                <p className="text-3xl font-bold text-white">{report.summary.criticalTasksCount}</p>
              </div>
              <div className="bg-orange-900/20 border border-orange-800/30 rounded-lg p-4 text-center">
                <h4 className="text-orange-400 text-sm font-medium mb-1">Overdue Tasks</h4>
                <p className="text-3xl font-bold text-white">{report.summary.overdueTasksCount}</p>
              </div>
              <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4 text-center">
                <h4 className="text-blue-400 text-sm font-medium mb-1">Total Tasks</h4>
                <p className="text-3xl font-bold text-white">{report.summary.totalTasksCount}</p>
              </div>
            </div>

            {/* Top Users with Critical Tasks */}
            {report.topUsers && report.topUsers.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-emerald-400 mb-2">Users with Most Critical/Overdue Tasks</h3>
                <div className="bg-slate-700/30 rounded-lg border border-slate-600 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-600 hover:bg-slate-700/50">
                        <TableHead className="text-gray-400">User</TableHead>
                        <TableHead className="text-gray-400 text-right">Task Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.topUsers.map((user) => (
                        <TableRow key={user.id} className="border-slate-600 hover:bg-slate-700/50">
                          <TableCell className="font-medium flex items-center">
                            <User className="h-4 w-4 mr-2 text-gray-400" />
                            {user.name}
                            {user.email && <span className="ml-2 text-gray-400 text-xs">({user.email})</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className="bg-red-500/20 text-red-300">{user.taskCount}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Critical and Overdue Tasks List */}
            {report.tasks && report.tasks.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-emerald-400 mb-2">Critical & Overdue Tasks</h3>
                <div className="bg-slate-700/30 rounded-lg border border-slate-600 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-600 hover:bg-slate-700/50">
                        <TableHead className="text-gray-400">Task</TableHead>
                        <TableHead className="text-gray-400">Priority</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Due Date</TableHead>
                        <TableHead className="text-gray-400">Assigned To</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.tasks.map((task) => (
                        <TableRow key={task.id} className="border-slate-600 hover:bg-slate-700/50">
                          <TableCell className="font-medium">
                            {task.title}
                            {task.isOverdue && (
                              <Badge className="ml-2 bg-red-500/20 text-red-300">Overdue</Badge>
                            )}
                          </TableCell>
                          <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                          <TableCell>{getStatusBadge(task.status)}</TableCell>
                          <TableCell>
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                          </TableCell>
                          <TableCell>{task.assignedTo || 'Unassigned'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CriticalTasksReport;