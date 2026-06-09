
CREATE POLICY "Users can update their own swipes"
  ON public.swipes
  FOR UPDATE
  USING (auth.uid() = swiper_id)
  WITH CHECK (auth.uid() = swiper_id);
