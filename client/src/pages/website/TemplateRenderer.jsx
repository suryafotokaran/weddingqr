import Template1 from './templates/Template1';
import Template2 from './templates/Template2';
import Template3 from './templates/Template3';
import Template4 from './templates/Template4';
import Template5 from './templates/Template5';
import Template6 from './templates/Template6';
import Template7 from './templates/Template7';
import Template8 from './templates/Template8';
import Template9 from './templates/Template9';
import Template10 from './templates/Template10';

const MAP = {
  template1: Template1,
  template2: Template2,
  template3: Template3,
  template4: Template4,
  template5: Template5,
  template6: Template6,
  template7: Template7,
  template8: Template8,
  template9: Template9,
  template10: Template10,
};

/**
 * TemplateRenderer
 * To add a new template: create TemplateN.jsx, add to MAP above.
 */
export default function TemplateRenderer({ templateId, data }) {
  const Tpl = MAP[templateId] || Template1;
  return <Tpl data={data} />;
}
