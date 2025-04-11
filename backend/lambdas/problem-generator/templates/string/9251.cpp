// BOJ - 9251

#include <iostream>
#include <string>

int dp[1001][1001];

using namespace std;

string a,b;

int max(int a,int b)
{
	return a>b?a:b;
}
int main()
{
	cin.tie(0);
	ios_base::sync_with_stdio(false);
	cin >> a >> b;
	for(int i=1; i<=a.size(); i++)
		for(int j=1; j<=b.size(); j++)
			dp[i][j]=max(max(dp[i-1][j],dp[i][j-1]),dp[i-1][j-1]+(a[i - 1]==b[j - 1]));
			
	printf("%d",dp[a.size()][b.size()]);
}