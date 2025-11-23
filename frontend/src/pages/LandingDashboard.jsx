import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link } from 'react-router-dom';
import { 
  Vote, 
  Coins, 
  FileText, 
  Users,
  DollarSign,
  ArrowRight,
  Shield,
  Zap,
  Globe,
  CheckCircle,
  Sparkles,
  Lock,
  Activity,
  TrendingUp,
  Clock,
  Target,
  BookOpen,
  BarChart3,
  PieChart,
  Play,
  ExternalLink,
  Award,
  Lightbulb,
  HelpCircle
} from 'lucide-react';

const LandingDashboard = () => {
  const { isConnected } = useAccount();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const stats = {
    totalProposals: 24,
    treasuryBalance: '125.50',
    userVotingPower: '1500',
    userTokenBalance: '1500',
    totalSupply: '1000000',
  };

  // Live Statistics
  const liveStats = [
    {
      title: 'Active Members',
      value: '2,847',
      change: '+12%',
      changeType: 'positive',
      icon: Users,
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      title: 'Participation Rate',
      value: '73.2%',
      change: '+5.1%',
      changeType: 'positive',
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      title: 'Total Votes Cast',
      value: '18,492',
      change: '+8.3%',
      changeType: 'positive',
      icon: 'custom-logo',
      gradient: 'from-purple-500 to-pink-600',
    },
    {
      title: 'Avg Voting Time',
      value: '2.3 days',
      change: '-0.5 days',
      changeType: 'positive',
      icon: Clock,
      gradient: 'from-orange-500 to-amber-600',
    },
  ];

  // Token Economics Data
  const tokenEconomics = {
    totalSupply: '1,000,000',
    circulatingSupply: '650,000',
    treasuryHolding: '200,000',
    stakingRewards: '100,000',
    teamAllocation: '50,000',
    distribution: [
      { name: 'Community', value: 65, color: 'bg-blue-500' },
      { name: 'Treasury', value: 20, color: 'bg-emerald-500' },
      { name: 'Staking', value: 10, color: 'bg-purple-500' },
      { name: 'Team', value: 5, color: 'bg-orange-500' }
    ]
  };

  // FAQ Data
  const faqs = [
    {
      question: 'What is ShadowID DAO?',
      answer: 'ShadowID DAO is a revolutionary decentralized organization that requires identity verification for participation. We integrate ShadowID (our privacy-preserving KYC/KYB system) as the core governance layer, ensuring all participants are verified while maintaining complete privacy through zero-knowledge proofs.'
    },
    {
      question: 'How do I join the DAO?',
      answer: 'To participate in ShadowID DAO: 1) Connect your wallet, 2) Complete KYC (individuals) or KYB (businesses) verification through our ShadowID system, 3) Acquire DVT tokens, 4) Start voting on proposals and participating in verified governance.'
    },
    {
      question: 'What are the identity requirements?',
      answer: 'All DAO participants must complete identity verification through ShadowID. Individuals complete KYC verification, businesses complete KYB verification. All verification uses zero-knowledge proofs, so your sensitive data never leaves your device while proving eligibility.'
    },
    {
      question: 'How does identity-gated governance work?',
      answer: 'Once verified through ShadowID, you can participate in governance while remaining anonymous. Your identity proof confirms eligibility without revealing personal information. Proposals are voted on by verified members, ensuring legitimate participation while maintaining privacy.'
    }
  ];

  const features = [
    {
      icon: 'custom-logo',
      title: 'Identity-Gated DAO',
      description: 'First DAO requiring KYC/KYB verification for participation while maintaining privacy',
      color: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-500'
    },
    {
      icon: Shield,
      title: 'ShadowID Integration',
      description: 'Built-in identity verification system using zero-knowledge proofs for complete privacy',
      color: 'from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-500'
    },
    {
      icon: Zap,
      title: 'Verified Governance',
      description: 'All proposals and votes from verified participants ensure legitimate democratic process',
      color: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-500'
    },
    {
      icon: Globe,
      title: 'Regulatory Compliant',
      description: 'Meet institutional requirements while preserving individual privacy and anonymity',
      color: 'from-orange-500 to-orange-600',
      iconBg: 'bg-orange-500'
    }
  ];

  const statsData = [
    {
      title: 'Total Proposals',
      value: stats.totalProposals,
      icon: FileText,
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      title: 'Treasury Balance',
      value: `${parseFloat(stats.treasuryBalance).toFixed(2)} ETH`,
      icon: DollarSign,
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      title: 'Total Supply',
      value: `${parseFloat(stats.totalSupply).toLocaleString()} DVT`,
      icon: Coins,
      gradient: 'from-orange-500 to-amber-600',
    },
  ];

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <section className="relative px-4 pt-20 pb-32">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <div className="flex items-center justify-center mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-xl opacity-50"></div>
                  <div className="w-20 h-20 relative z-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
                    <img 
                      src="/shadowid-logo.png" 
                      alt="ShadowID Logo" 
                      className="w-16 h-16 object-contain mb-4"
                    />
                  </div>
                </div>
                <div className="ml-6 text-left">
                  <h1 className="text-6xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">
                    ShadowID DAO
                  </h1>
                  <p className="text-xl text-gray-600 font-medium">Identity-Gated Decentralized Governance</p>
                </div>
              </div>
              
              <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
                The world's first DAO that integrates **ShadowID** identity verification as a core governance requirement. 
                Complete KYC/KYB verification through zero-knowledge proofs, participate in verified governance, and shape the future of identity-gated DAOs while maintaining complete privacy.
              </p>
              
              <div>
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <button
                      onClick={openConnectModal}
                      className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl shadow-indigo-500/50 overflow-hidden hover:shadow-indigo-500/70 transition-all"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                      <span className="relative flex items-center gap-3">
                        <Sparkles className="w-5 h-5" />
                        Connect Wallet to Start
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </button>
                  )}
                </ConnectButton.Custom>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
            {statsData.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={stat.title} className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl"></div>
                  <div className="relative bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 text-center border border-gray-100 hover:border-transparent transition-all duration-300">
                    <div className={`w-14 h-14 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                      {stat.icon === 'custom-logo' ? (
                        <img src="/shadowid-logo.png" alt="ShadowID Logo" className="w-8 h-8 object-contain" />
                      ) : (
                        <Icon className="w-7 h-7 text-white" />
                      )}
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mb-2">{stat.value}</h3>
                    <p className="text-gray-600 font-medium">{stat.title}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="relative py-24 bg-white/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-20">
              <span className="inline-block px-4 py-2 bg-indigo-100 text-indigo-600 rounded-full text-sm font-semibold mb-4">
                Why Choose Us
              </span>
              <h2 className="text-5xl font-black text-gray-900 mb-6">
                Built for the Future of <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Identity</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Powered by cutting-edge blockchain technology to deliver unmatched security, 
                transparency, and efficiency in decentralized decision-making.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl"></div>
                    <div className="relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 h-full">
                      <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-6 shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                        {feature.icon === 'custom-logo' ? (
                          <img src="/shadowid-logo.png" alt="ShadowID Logo" className="w-10 h-10 object-contain" />
                        ) : (
                          <Icon className="w-8 h-8 text-white" />
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative py-24 bg-gradient-to-b from-white/50 to-indigo-50/50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-20">
              <span className="inline-block px-4 py-2 bg-purple-100 text-purple-600 rounded-full text-sm font-semibold mb-4">
                Getting Started
              </span>
              <h2 className="text-5xl font-black text-gray-900 mb-6">
                Simple Steps to <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Participate</span>
              </h2>
              <p className="text-xl text-gray-600">
                Join thousands in privacy-preserving identity verification
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200"></div>
              
              {[
                {
                  step: '1',
                  title: 'Complete Identity Verification',
                  description: 'Complete KYC (individuals) or KYB (businesses) through our ShadowID system using zero-knowledge proofs',
                  icon: Shield,
                  color: 'from-indigo-500 to-blue-600'
                },
                {
                  step: '2',
                  title: 'Connect Wallet & Get DVT Tokens',
                  description: 'Link your verified identity to your wallet and acquire DVT tokens for DAO participation',
                  icon: Coins,
                  color: 'from-purple-500 to-pink-600'
                },
                {
                  step: '3',
                  title: 'Participate in Verified DAO',
                  description: 'Create proposals, vote on governance, and shape the future with verified participants',
                  icon: Activity,
                  color: 'from-pink-500 to-rose-600'
                }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.step} className="relative">
                    <div className="relative bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100">
                      <div className={`absolute -top-6 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center shadow-lg`}>
                        <span className="text-white text-2xl font-black">{item.step}</span>
                      </div>
                      <div className="mt-8 text-center">
                        <Icon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                        <p className="text-gray-600 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative py-24 bg-gradient-to-b from-white/50 to-slate-50/50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-20">
              <span className="inline-block px-4 py-2 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold mb-4">
                Live Metrics
              </span>
              <h2 className="text-5xl font-black text-gray-900 mb-6">
                Real-Time <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Verification Stats</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Track the pulse of our identity verification platform with live verification metrics and user activity data.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {liveStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.title} className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl"></div>
                    <div className="relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 text-center">
                      <div className={`w-16 h-16 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                        {stat.icon === 'custom-logo' ? (
                          <img src="/shadowid-logo.png" alt="ShadowID Logo" className="w-10 h-10 object-contain" />
                        ) : (
                          <Icon className="w-8 h-8 text-white" />
                        )}
                      </div>
                      <h3 className="text-3xl font-black text-gray-900 mb-2">{stat.value}</h3>
                      <p className="text-gray-600 font-medium mb-3">{stat.title}</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                        stat.changeType === 'positive' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                      }`}>
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {stat.change}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Token Economics Section */}
        <section className="relative py-24 bg-gradient-to-br from-slate-50 to-indigo-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-20">
              <span className="inline-block px-4 py-2 bg-indigo-100 text-indigo-600 rounded-full text-sm font-semibold mb-4">
                Token Economics
              </span>
              <h2 className="text-5xl font-black text-gray-900 mb-6">
                DVT Token <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Distribution</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Understand the tokenomics behind ShadowID and how SID tokens power our identity verification ecosystem.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Token Distribution Chart */}
              <div className="relative">
                <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Token Distribution</h3>
                  
                  {/* Simple Distribution Visualization */}
                  <div className="space-y-4">
                    {tokenEconomics.distribution.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 ${item.color} rounded`}></div>
                          <span className="font-medium text-gray-700">{item.name}</span>
                        </div>
                        <span className="font-bold text-gray-900">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Token Stats */}
                  <div className="mt-8 pt-6 border-t border-gray-200 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Supply</span>
                      <span className="font-semibold">{tokenEconomics.totalSupply} DVT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Circulating Supply</span>
                      <span className="font-semibold">{tokenEconomics.circulatingSupply} DVT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Treasury Holdings</span>
                      <span className="font-semibold">{tokenEconomics.treasuryHolding} DVT</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Token Utility */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Vote className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">Verification Rights</h4>
                      <p className="text-gray-600">Vote on proposals and shape the DAO's future</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                      <Coins className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">Staking Rewards</h4>
                      <p className="text-gray-600">Earn rewards by staking your tokens</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">Participation Incentives</h4>
                      <p className="text-gray-600">Get rewarded for active identity verification and proof generation</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
                  <h4 className="text-lg font-bold mb-2">Ready to Join the DAO?</h4>
                  <p className="mb-4 opacity-90">Complete identity verification and join the world's first identity-gated DAO.</p>
                  <button className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                    Start Verification
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Educational Resources / FAQ Section */}
        <section className="relative py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-20">
              <span className="inline-block px-4 py-2 bg-emerald-100 text-emerald-600 rounded-full text-sm font-semibold mb-4">
                Learn & Understand
              </span>
              <h2 className="text-5xl font-black text-gray-900 mb-6">
                Frequently Asked <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Questions</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Everything you need to know about ShadowID governance and identity verification.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <HelpCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 mb-3">{faq.question}</h4>
                      <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-16">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 border border-emerald-200">
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-2xl font-bold text-gray-900">Need More Help?</h3>
                    <p className="text-gray-600">Explore our comprehensive documentation and tutorials.</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Watch Tutorial
                  </button>
                  <button className="bg-white text-emerald-600 border-2 border-emerald-600 px-6 py-3 rounded-lg font-semibold hover:bg-emerald-50 transition-all flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Read Documentation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Ready to Shape the Future Section - Moved to Bottom */}
        <section className="relative py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600"></div>
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4 4-1.79 4-4zm0-10c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4 4-1.79 4-4zm0-10c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4 4-1.79 4-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
          }}></div>
          
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div>
              <Sparkles className="w-16 h-16 text-white mx-auto mb-6 opacity-80" />
              <h2 className="text-5xl font-black text-white mb-6">
                Ready to Shape the Future?
              </h2>
              <p className="text-xl text-indigo-100 mb-10 max-w-2xl mx-auto leading-relaxed">
                Join the ShadowID community and start using privacy-preserving identity verification today. 
                Your voice matters.
              </p>
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button
                    onClick={openConnectModal}
                    className="group relative inline-flex items-center gap-3 bg-white text-indigo-600 px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-white/50 overflow-hidden transition-all"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                    <span className="relative flex items-center gap-3">
                      <Sparkles className="w-5 h-5" />
                      Connect Wallet & Get Started
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>
                )}
              </ConnectButton.Custom>
            </div>
          </div>
        </section>


      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Proposals',
      value: stats.totalProposals,
      icon: FileText,
      gradient: 'from-blue-500 to-indigo-600',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Treasury Balance',
      value: `${parseFloat(stats.treasuryBalance).toFixed(2)} ETH`,
      icon: DollarSign,
      gradient: 'from-emerald-500 to-teal-600',
      change: '+5.2%',
      changeType: 'positive'
    },
    {
      title: 'Your Voting Power',
      value: `${parseFloat(stats.userVotingPower).toLocaleString()} DVT`,
      icon: 'custom-logo',
      gradient: 'from-purple-500 to-pink-600',
      change: 'No change',
      changeType: 'neutral'
    },
    {
      title: 'Total Supply',
      value: `${parseFloat(stats.totalSupply).toLocaleString()} DVT`,
      icon: Coins,
      gradient: 'from-orange-500 to-amber-600',
      change: '+2.1%',
      changeType: 'positive'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative container mx-auto px-4 py-12">
        <div className="space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-xl opacity-50"></div>
                <div className="w-16 h-16 relative z-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Vote className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="ml-4 text-left">
                <h1 className="text-5xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  DVote DAO
                </h1>
                <p className="text-lg text-gray-600 font-medium">Welcome Back, Identity Pioneer!</p>
              </div>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Shape the future through privacy-preserving identity verification and zero-knowledge proof technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.title} className="relative group hover:scale-105 transition-transform duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl"></div>
                  <div className="relative bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-gray-100 hover:border-transparent transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-14 h-14 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                        {stat.icon === 'custom-logo' ? (
                          <img src="/shadowid-logo.png" alt="ShadowID Logo" className="w-8 h-8 object-contain" />
                        ) : (
                          <Icon className="w-7 h-7 text-white" />
                        )}
                      </div>
                      <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                        stat.changeType === 'positive' ? 'bg-emerald-100 text-emerald-600' : 
                        stat.changeType === 'negative' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {stat.change}
                      </span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mb-1">{stat.value}</h3>
                    <p className="text-gray-600 font-medium">{stat.title}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl"></div>
              <div className="relative bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                    <Vote className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Your Voting Power</h3>
                </div>
                <div className="space-y-5">
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-indigo-50 rounded-xl">
                    <span className="text-gray-600 font-medium">Token Balance:</span>
                    <span className="font-bold text-gray-900 text-lg">{parseFloat(stats.userTokenBalance).toFixed(2)} DVT</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-purple-50 rounded-xl">
                    <span className="text-gray-600 font-medium">Voting Power:</span>
                    <span className="font-bold text-gray-900 text-lg">{parseFloat(stats.userVotingPower).toFixed(2)} DVT</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-300 shadow-lg"
                      style={{ 
                        width: `${Math.min((parseFloat(stats.userVotingPower) / parseFloat(stats.totalSupply)) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 bg-indigo-50 p-3 rounded-lg">
                    <span className="font-semibold text-indigo-600">
                      {((parseFloat(stats.userVotingPower) / parseFloat(stats.totalSupply)) * 100).toFixed(4)}%
                    </span> of total voting power
                  </p>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl"></div>
              <div className="relative bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mr-4">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Quick Actions</h3>
                </div>
                <div className="space-y-3">
                  <Link 
                    to="/create-proposal"
                    className="group/btn relative bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 w-full text-center flex items-center justify-center gap-2 shadow-lg hover:shadow-xl overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover/btn:opacity-100 transition-opacity"></span>
                    <span className="relative flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Create New Proposal
                    </span>
                  </Link>
                  <Link 
                    to="/proposals"
                    className="bg-white hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 text-indigo-600 border-2 border-indigo-600 font-bold py-4 px-6 rounded-xl transition-all duration-200 w-full text-center flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <Activity className="w-5 h-5" />
                    View All Proposals
                  </Link>
                  <Link 
                    to="/governance"
                    className="bg-white hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 text-purple-600 border-2 border-purple-600 font-bold py-4 px-6 rounded-xl transition-all duration-200 w-full text-center flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <Users className="w-5 h-5" />
                    Delegate Voting Power
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl"></div>
            <div className="relative bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-600 rounded-xl flex items-center justify-center mr-4">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Recent Activity</h3>
              </div>
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 text-lg font-medium">Recent DAO governance activity will appear here</p>
                <p className="text-gray-400 text-sm mt-2">Complete identity verification to start participating in verified governance</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingDashboard;
