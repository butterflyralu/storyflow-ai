import { WizardProvider } from '@/context/WizardContext';
import { Wizard } from '@/components/Wizard';

const Index = () => (
  <WizardProvider>
    <Wizard />
  </WizardProvider>
);

export default Index;
