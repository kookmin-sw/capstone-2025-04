// BOJ - 1065 한 수

#include <stdio.h>
int main()
{
	int n,a[3];
	scanf("%d",&n);
	int cnt=0;
	for(int i=1; i<=n; i++)
	{
		if(i<100) cnt++;
		else if(i==1e3) break;
		else
		{
			a[0]=i/100;
			a[1]=(i%100)/10;
			a[2]=i%10;
			if(a[0]-a[1]==a[1]-a[2]) cnt++;
		}
	}
	printf("%d",cnt);
 } 