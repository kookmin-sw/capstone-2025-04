// BOJ-2217 로프
#include <iostream>
#include <algorithm>

using namespace std;

int main()
{
	int n;
	cin >> n;
	int d[n];
	for(int i=0; i<n; i++)
		cin >> d[i];
	sort(d,d+n);
	int ans=0;
	for(int i=0; i<n; i++)
		ans=max(ans,d[i]*(n-i));
	cout << ans;
} 