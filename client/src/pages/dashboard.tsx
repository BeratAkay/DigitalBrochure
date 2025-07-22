import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Plus,
  Megaphone,
  PlayCircle,
  FileText,
  Download,
  Edit,
  Trash2,
} from "lucide-react";
import type { Campaign } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
    queryFn: async () => {
      const response = await fetch(`/api/campaigns?userId=${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery<{
    totalCampaigns: number;
    activeCampaigns: number;
    totalTemplates: number;
    totalDownloads: number;
  }>({
    queryKey: ["/api/statistics"],
    queryFn: async () => {
      const response = await fetch(`/api/statistics?userId=${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch statistics');
      return response.json();
    },
    enabled: !!user,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "completed":
        return <Badge className="bg-yellow-100 text-yellow-800">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  if (campaignsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your marketing campaigns and brochures</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-12 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your marketing campaigns and brochures</p>
        </div>
        <Link href="/create-campaign">
          <Button className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Create Campaign</span>
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Campaigns</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalCampaigns || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Megaphone className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Campaigns</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.activeCampaigns || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <PlayCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Templates</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalTemplates || 0}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Downloads</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalDownloads || 0}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Download className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Campaigns</h2>
        </div>
        {campaigns.length === 0 ? (
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first marketing campaign.</p>
            <Link href="/create-campaign">
              <Button>Create Campaign</Button>
            </Link>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Campaign Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {campaigns.map((campaign: Campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{campaign.name}</p>
                          <p className="text-sm text-gray-500">{campaign.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(campaign.status)}
                    </td>
                    <td className="px-6 py-4 text-gray-900">{campaign.companyName || "N/A"}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {campaign.createdAt ? formatDate(campaign.createdAt) : "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" className="text-primary">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-green-600">
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
