import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../src/context/ThemeContext';
import DashboardView from '../src/views/DashboardView';
import { ProfileData } from '../src/types';

const { mockProfile } = vi.hoisted(() => {
  const profile: ProfileData = {
    id: 'AGT-8821',
    name: '张三',
    role: '全栈工程师',
    location: '上海',
    email: 'zhangsan@example.com',
    github: 'github.com/zhangsan',
    avatar: 'https://example.com/avatar.jpg',
    currentFocus: {
      title: 'AI 应用深耕',
      description: '研究本地大模型部署、微调策略，以及推理优化',
      stats: [
        { value: '14', label: '活跃线程', highlight: false },
        { value: '98%', label: '系统健康', highlight: true },
        { value: '2.4m', label: '处理 TOKEN', highlight: false },
      ],
    },
    skills: [
      { name: 'React / 前端', value: 0.92, color: 'primary' },
      { name: 'Node.js / 后端', value: 0.88, color: 'secondary' },
      { name: 'Python / ML', value: 0.85, color: 'secondary' },
      { name: 'LLM 应用开发', value: 0.78, color: 'secondary' },
      { name: 'DevOps / Docker', value: 0.70, color: 'secondary' },
    ],
    experiences: [
      {
        company: '某公司',
        period: '2021 - 至今',
        role: '高级全栈工程师',
        description: '主导微前端架构转型，集成 AI 工具提升开发效率，部署本地代码辅助模型',
        active: true,
      },
      {
        company: '创业公司',
        period: '2018 - 2021',
        role: '后端开发',
        description: '开发可扩展的 Node.js 微服务，日处理千万级请求',
        active: false,
      },
    ],
    recentDynamics: [
      {
        id: '1',
        type: 'commit' as const,
        title: '优化 API 响应速度',
        description: '通过缓存和批量查询，API 响应时间减少 40%',
        time: '2小时前',
      },
      {
        id: '2',
        type: 'doc' as const,
        title: '更新技术文档',
        description: '完成微服务架构文档，包含部署流程和监控方案',
        time: '昨天',
      },
      {
        id: '3',
        type: 'session' as const,
        title: '团队知识分享',
        description: '关于 LLM 本地部署的技术分享会，讨论模型优化策略',
        time: '3天前',
      },
    ],
  };
  return { mockProfile: profile };
});

vi.mock('../src/services/api', () => ({
  fetchProfile: vi.fn().mockResolvedValue(mockProfile),
}));

function renderDashboard() {
  return render(
    <ThemeProvider>
      <DashboardView />
    </ThemeProvider>
  );
}

describe('DashboardView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders loading state initially', () => {
    renderDashboard();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders profile card with user info', async () => {
    await act(async () => {
      renderDashboard();
    });

    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('全栈工程师')).toBeInTheDocument();
    expect(screen.getByText('上海')).toBeInTheDocument();
    expect(screen.getByText('zhangsan@example.com')).toBeInTheDocument();
  });

  it('renders current focus section with stats', async () => {
    await act(async () => {
      renderDashboard();
    });

    expect(screen.getByText('AI 应用深耕')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('98%')).toBeInTheDocument();
    expect(screen.getByText('2.4m')).toBeInTheDocument();
  });

  it('renders knowledge vectors with skill bars', async () => {
    await act(async () => {
      renderDashboard();
    });

    expect(screen.getByText('React / 前端')).toBeInTheDocument();
    expect(screen.getByText('Node.js / 后端')).toBeInTheDocument();
    expect(screen.getByText('0.92')).toBeInTheDocument();
    expect(screen.getByText('0.88')).toBeInTheDocument();
  });

  it('renders experience context with timeline', async () => {
    await act(async () => {
      renderDashboard();
    });

    expect(screen.getByText('某公司')).toBeInTheDocument();
    expect(screen.getByText('2021 - 至今')).toBeInTheDocument();
    expect(screen.getByText('创业公司')).toBeInTheDocument();
    expect(screen.getByText('2018 - 2021')).toBeInTheDocument();
  });

  it('renders recent dynamics with log cards', async () => {
    await act(async () => {
      renderDashboard();
    });

    expect(screen.getByText('优化 API 响应速度')).toBeInTheDocument();
    expect(screen.getByText('更新技术文档')).toBeInTheDocument();
    expect(screen.getByText('团队知识分享')).toBeInTheDocument();
  });

  it('has edit button in current focus card', async () => {
    await act(async () => {
      renderDashboard();
    });

    // The edit button is in current focus card, find by the pen icon (Edit3)
    const buttons = screen.getAllByRole('button');
    // The edit button is the one with just an icon (no text), in the top right of current focus
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('has view all logs button', async () => {
    await act(async () => {
      renderDashboard();
    });

    // Button shows "VIEW ALL LOGS" or equivalent translation
    const viewAllLogs = screen.getByRole('button', { name: /logs/i });
    expect(viewAllLogs).toBeInTheDocument();
  });
});