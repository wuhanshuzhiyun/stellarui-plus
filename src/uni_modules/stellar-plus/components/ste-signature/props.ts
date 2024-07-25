import type { PropType } from 'vue'
import type { ImgType, SizeType } from '../../types/index'

export default {
  customClass: { type: String, default: '' },
  lineWidth: { type: Number, default: 3 },
  strokeColor: { type: String, default: '#000000' },
  type: { type: String as PropType<ImgType>, default: 'png' },
  width: { type: [String, Number] as PropType<SizeType>, default: '100%' },
  height: { type: [String, Number] as PropType<SizeType>, default: '100%' },
}
